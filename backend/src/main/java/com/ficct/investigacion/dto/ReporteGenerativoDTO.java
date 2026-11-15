package com.ficct.investigacion.dto;

import java.util.List;
import java.util.Map;

public class ReporteGenerativoDTO {

    public static class ConsultaRequest {
        private String prompt;
        private String tablaFiltro; // opcional: usuarios, convocatorias, tareas, etc.
        private boolean soloLectura = true;

        public String getPrompt() { return prompt; }
        public void setPrompt(String prompt) { this.prompt = prompt; }
        public String getTablaFiltro() { return tablaFiltro; }
        public void setTablaFiltro(String tablaFiltro) { this.tablaFiltro = tablaFiltro; }
        public boolean isSoloLectura() { return soloLectura; }
        public void setSoloLectura(boolean soloLectura) { this.soloLectura = soloLectura; }
    }

    public static class KpiItemDTO {
        private String etiqueta;
        private String valor;
        private String subtitulo;
        private String icono; // total, money, score, percent

        public KpiItemDTO() {}
        public KpiItemDTO(String etiqueta, String valor, String subtitulo, String icono) {
            this.etiqueta = etiqueta;
            this.valor = valor;
            this.subtitulo = subtitulo;
            this.icono = icono;
        }

        public String getEtiqueta() { return etiqueta; }
        public void setEtiqueta(String etiqueta) { this.etiqueta = etiqueta; }
        public String getValor() { return valor; }
        public void setValor(String valor) { this.valor = valor; }
        public String getSubtitulo() { return subtitulo; }
        public void setSubtitulo(String subtitulo) { this.subtitulo = subtitulo; }
        public String getIcono() { return icono; }
        public void setIcono(String icono) { this.icono = icono; }
    }

    public static class GraficoConfigDTO {
        private String tipo; // BAR, PIE, LINE
        private String ejeX;
        private String ejeY;
        private List<Map<String, Object>> series;

        public String getTipo() { return tipo; }
        public void setTipo(String tipo) { this.tipo = tipo; }
        public String getEjeX() { return ejeX; }
        public void setEjeX(String ejeX) { this.ejeX = ejeX; }
        public String getEjeY() { return ejeY; }
        public void setEjeY(String ejeY) { this.ejeY = ejeY; }
        public List<Map<String, Object>> getSeries() { return series; }
        public void setSeries(List<Map<String, Object>> series) { this.series = series; }
    }

    public static class ConsultaResponse {
        private boolean exito;
        private String titulo;
        private String explicacion;
        private String sqlEjecutado;
        private List<String> columnas;
        private List<Map<String, Object>> filas;
        private List<KpiItemDTO> kpis;
        private GraficoConfigDTO grafico;
        private long tiempoEjecucionMs;
        private String error;

        public boolean isExito() { return exito; }
        public void setExito(boolean exito) { this.exito = exito; }
        public String getTitulo() { return titulo; }
        public void setTitulo(String titulo) { this.titulo = titulo; }
        public String getExplicacion() { return explicacion; }
        public void setExplicacion(String explicacion) { this.explicacion = explicacion; }
        public String getSqlEjecutado() { return sqlEjecutado; }
        public void setSqlEjecutado(String sqlEjecutado) { this.sqlEjecutado = sqlEjecutado; }
        public List<String> getColumnas() { return columnas; }
        public void setColumnas(List<String> columnas) { this.columnas = columnas; }
        public List<Map<String, Object>> getFilas() { return filas; }
        public void setFilas(List<Map<String, Object>> filas) { this.filas = filas; }
        public List<KpiItemDTO> getKpis() { return kpis; }
        public void setKpis(List<KpiItemDTO> kpis) { this.kpis = kpis; }
        public GraficoConfigDTO getGrafico() { return grafico; }
        public void setGrafico(GraficoConfigDTO grafico) { this.grafico = grafico; }
        public long getTiempoEjecucionMs() { return tiempoEjecucionMs; }
        public void setTiempoEjecucionMs(long tiempoEjecucionMs) { this.tiempoEjecucionMs = tiempoEjecucionMs; }
        public String getError() { return error; }
        public void setError(String error) { this.error = error; }
    }
}
