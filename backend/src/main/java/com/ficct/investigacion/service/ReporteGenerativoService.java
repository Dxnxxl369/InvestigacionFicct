package com.ficct.investigacion.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.ReporteGenerativoDTO.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class ReporteGenerativoService {

    private static final Logger log = LoggerFactory.getLogger(ReporteGenerativoService.class);

    private final JdbcTemplate jdbcTemplate;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.groq.model:qwen/qwen3.8-27b}")
    private String groqModel;

    public ReporteGenerativoService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public ConsultaResponse generarReporte(ConsultaRequest request) {
        long inicio = System.currentTimeMillis();
        ConsultaResponse response = new ConsultaResponse();

        String prompt = request.getPrompt() != null ? request.getPrompt().trim() : "";
        if (prompt.isEmpty()) {
            response.setExito(false);
            response.setError("Debes ingresar una consulta o pregunta para generar el reporte.");
            return response;
        }

        try {
            // 1. Obtener SQL generado por la IA o fallback semántico
            String sqlGenerado = obtenerSqlDesdeLlm(prompt, request.getTablaFiltro());
            sqlGenerado = sanitizarSql(sqlGenerado);

            // Validar que sea estrictamente un SELECT
            if (!sqlGenerado.toLowerCase(Locale.ROOT).trim().startsWith("select")) {
                throw new IllegalArgumentException("Por motivos de seguridad, solo se permiten consultas SELECT de lectura.");
            }

            // 2. Ejecutar la consulta de solo lectura en PostgreSQL
            List<Map<String, Object>> filas = jdbcTemplate.queryForList(sqlGenerado);

            // 3. Extraer columnas y ordenar
            List<String> columnas = new ArrayList<>();
            if (!filas.isEmpty()) {
                columnas.addAll(filas.get(0).keySet());
            }

            // 4. Calcular KPIs automáticamente
            List<KpiItemDTO> kpis = deducirKpis(filas, columnas);

            // 5. Configurar Gráfico Inteligente (Barras, Dona o Líneas)
            GraficoConfigDTO grafico = deducirGrafico(filas, columnas);

            long tiempoTotal = System.currentTimeMillis() - inicio;

            response.setExito(true);
            response.setTitulo(generarTituloReporte(prompt));
            response.setExplicacion("Reporte generado a partir de tu consulta: \"" + prompt + "\"");
            response.setSqlEjecutado(sqlGenerado);
            response.setColumnas(columnas);
            response.setFilas(filas);
            response.setKpis(kpis);
            response.setGrafico(grafico);
            response.setTiempoEjecucionMs(tiempoTotal);

        } catch (Exception e) {
            log.error("Error al procesar reporte generativo: {}", e.getMessage(), e);
            response.setExito(false);
            response.setError("No se pudo completar la consulta: " + e.getMessage());
            response.setTiempoEjecucionMs(System.currentTimeMillis() - inicio);
        }

        return response;
    }

    private String obtenerSqlDesdeLlm(String promptUsuario, String tablaFiltro) {
        String esquemaDb = """
                ESQUEMA DE TABLAS EN POSTGRESQL (SOLO LECTURA):
                - usuarios (id, nombre, apellido, email, celular, registro_universitario, rol: 'ADMIN'|'DOCENTE'|'JURADO'|'ESTUDIANTE', estado: 'ACTIVO'|'SUSPENDIDO', created_at)
                - convocatorias (id, titulo, descripcion, tipo: 'FERIA'|'HACKATHON'|'CONCURSO'|'INVESTIGACION', modalidad_inscripcion: 'INDIVIDUAL'|'GRUPAL', estado: 'BORRADOR'|'PUBLICADA'|'FINALIZADA', fecha_cierre, tamano_equipo, max_integrantes_feria)
                - convocatoria_participantes (id, convocatoria_id, usuario_id, rol, estado_inscripcion: 'PENDIENTE'|'ACEPTADO'|'RECHAZADO'|'CANCELADO', nombre_equipo, fecha_solicitud, fecha_asignacion)
                - feria_postulaciones (id, convocatoria_id, participante_id, tema, area, categoria, materia, sigla, grupo_materia, docente, codigo_equipo, estado_inscripcion)
                - feria_integrantes (postulacion_id, nombre, carrera, celular, correo, registro, semestre, ferias, orden)
                - tareas (id, convocatoria_id, titulo, descripcion, puntaje_maximo, fecha_entrega, habilitada)
                - tarea_entregas (id, tarea_id, estudiante_id, calificacion, estado, fecha_entrega)
                - biblioteca_documentos (id, titulo, autor, categoria_id, tipo_archivo, descargas, visualizaciones, created_at)
                - biblioteca_categorias (id, nombre, descripcion)
                - grupos (id, convocatoria_id, nombre, estado)
                """;

        String systemPrompt = """
                Eres un Analista de Datos Senior y Especialista en SQL para PostgreSQL.
                Tu ÚNICA tarea es generar una consulta SQL SELECT óptima para responder a la solicitud del usuario, basándote en el esquema de tablas provisto.
                
                """ + esquemaDb + """
                
                REGLAS DE ORO:
                1. Solo genera consultas SELECT. NUNCA INSERT, UPDATE, DELETE, DROP o ALTER.
                2. Si la consulta pide contar o agrupar, usa COUNT(*), GROUP BY y alias claros (ej. AS total, AS cantidad).
                3. Si la consulta involucra varias tablas (ej. participantes y convocatorias), usa JOINs adecuados.
                4. Usa LIMIT 100 para evitar desbordes de memoria salvo agregaciones directas.
                5. Responde ÚNICAMENTE un objeto JSON sin formato markdown con esta estructura:
                {
                  "sql": "SELECT ...",
                  "titulo": "Título formal del reporte",
                  "explicacion": "Breve explicación de la consulta"
                }
                """;

        try {
            String url = "https://api.groq.com/openai/v1/chat/completions";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("model", groqModel);
            body.put("max_tokens", 400);
            body.put("temperature", 0.0);

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            messages.add(Map.of("role", "user", "content", promptUsuario + (tablaFiltro != null && !tablaFiltro.isBlank() ? " (Foco en tabla: " + tablaFiltro + ")" : "")));
            body.put("messages", messages);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> res = restTemplate.postForEntity(url, entity, String.class);

            if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                JsonNode root = objectMapper.readTree(res.getBody());
                String raw = root.path("choices").get(0).path("message").path("content").asText();
                String cleaned = limpiarJson(raw);
                JsonNode parsed = objectMapper.readTree(cleaned);
                if (parsed.hasNonNull("sql")) {
                    return parsed.get("sql").asText();
                }
            }
        } catch (Exception e) {
            log.warn("Fallo llamada a LLM para reporte SQL, usando fallback heurístico: {}", e.getMessage());
        }

        // Fallback Heurístico Local
        return generarSqlHeuristico(promptUsuario, tablaFiltro);
    }

    private String generarSqlHeuristico(String prompt, String tablaFiltro) {
        String p = prompt.toLowerCase(Locale.ROOT);

        if (p.contains("usuario") || p.contains("estudiante") || p.contains("docente") || "usuarios".equalsIgnoreCase(tablaFiltro)) {
            if (p.contains("rol") || p.contains("por rol")) {
                return "SELECT rol, COUNT(*) AS total FROM usuarios GROUP BY rol ORDER BY total DESC;";
            }
            if (p.contains("docente")) {
                return "SELECT id, nombre, apellido, email, celular, estado FROM usuarios WHERE rol = 'DOCENTE' ORDER BY id ASC;";
            }
            if (p.contains("estudiante") || p.contains("alumno")) {
                return "SELECT id, nombre, apellido, email, registro_universitario, celular, estado FROM usuarios WHERE rol = 'ESTUDIANTE' ORDER BY id ASC;";
            }
            return "SELECT id, nombre, apellido, email, rol, estado, created_at FROM usuarios ORDER BY id ASC LIMIT 50;";
        }

        if (p.contains("postulacion") || p.contains("equipo") || p.contains("feria") || "feria_postulaciones".equalsIgnoreCase(tablaFiltro)) {
            if (p.contains("area") || p.contains("categoría") || p.contains("categoria")) {
                return "SELECT categoria, COUNT(*) AS total_equipos FROM feria_postulaciones GROUP BY categoria ORDER BY total_equipos DESC;";
            }
            return "SELECT p.id, p.tema, p.categoria, p.area, p.docente, p.codigo_equipo, p.estado_inscripcion, c.titulo AS convocatoria FROM feria_postulaciones p JOIN convocatorias c ON p.convocatoria_id = c.id ORDER BY p.id ASC LIMIT 50;";
        }

        if (p.contains("tarea") || p.contains("entrega") || p.contains("calificacion") || p.contains("nota")) {
            return "SELECT t.id, t.titulo AS tarea, t.puntaje_maximo, c.titulo AS convocatoria, COUNT(e.id) AS total_entregas, ROUND(AVG(e.calificacion), 2) AS promedio_nota FROM tareas t JOIN convocatorias c ON t.convocatoria_id = c.id LEFT JOIN tarea_entregas e ON e.tarea_id = t.id GROUP BY t.id, t.titulo, t.puntaje_maximo, c.titulo ORDER BY t.id ASC;";
        }

        if (p.contains("biblioteca") || p.contains("documento") || p.contains("descarga")) {
            return "SELECT d.id, d.titulo, d.autor, c.nombre AS categoria, d.descargas, d.visualizaciones FROM biblioteca_documentos d LEFT JOIN biblioteca_categorias c ON d.categoria_id = c.id ORDER BY d.descargas DESC LIMIT 50;";
        }

        // Por defecto: Convocatorias
        if (p.contains("participante") || p.contains("inscrito")) {
            return "SELECT c.id, c.titulo, c.tipo, c.modalidad_inscripcion, COUNT(p.id) AS total_inscritos FROM convocatorias c LEFT JOIN convocatoria_participantes p ON c.id = p.convocatoria_id GROUP BY c.id, c.titulo, c.tipo, c.modalidad_inscripcion ORDER BY total_inscritos DESC;";
        }

        return "SELECT id, titulo, tipo, modalidad_inscripcion, estado, fecha_cierre FROM convocatorias ORDER BY id DESC LIMIT 50;";
    }

    private String sanitizarSql(String sql) {
        String clean = sql.trim();
        if (clean.startsWith("```sql")) clean = clean.substring(6);
        if (clean.startsWith("```")) clean = clean.substring(3);
        if (clean.endsWith("```")) clean = clean.substring(0, clean.length() - 3);
        clean = clean.trim();

        // Evitar inyección destructiva
        String upper = clean.toUpperCase(Locale.ROOT);
        String[] peligrosos = {"DROP ", "DELETE ", "UPDATE ", "INSERT ", "TRUNCATE ", "ALTER ", "EXEC ", "GRANT ", "REVOKE "};
        for (String p : peligrosos) {
            if (upper.contains(p)) {
                throw new SecurityException("Operación no permitida: Se detectó comando SQL no seguro (" + p.trim() + ")");
            }
        }
        return clean;
    }

    private String limpiarJson(String raw) {
        String c = raw.trim();
        if (c.startsWith("```json")) c = c.substring(7);
        if (c.startsWith("```")) c = c.substring(3);
        if (c.endsWith("```")) c = c.substring(0, c.length() - 3);
        return c.trim();
    }

    private List<KpiItemDTO> deducirKpis(List<Map<String, Object>> filas, List<String> columnas) {
        List<KpiItemDTO> kpis = new ArrayList<>();
        kpis.add(new KpiItemDTO("Total Registros", String.valueOf(filas.size()), "Filas devueltas por la consulta", "total"));

        if (filas.isEmpty()) return kpis;

        // Buscar columnas numéricas clave
        for (String col : columnas) {
            String colLower = col.toLowerCase(Locale.ROOT);
            if (colLower.contains("total") || colLower.contains("cantidad") || colLower.contains("conteo") || colLower.contains("inscrito") || colLower.contains("descarga")) {
                BigDecimal sum = BigDecimal.ZERO;
                BigDecimal max = BigDecimal.ZERO;
                int count = 0;
                for (Map<String, Object> fila : filas) {
                    Object val = fila.get(col);
                    if (val instanceof Number n) {
                        BigDecimal bd = new BigDecimal(n.toString());
                        sum = sum.add(bd);
                        if (bd.compareTo(max) > 0) max = bd;
                        count++;
                    }
                }
                if (count > 0) {
                    kpis.add(new KpiItemDTO("Suma (" + col + ")", sum.toPlainString(), "Suma total acumulada", "money"));
                    if (kpis.size() < 4) {
                        BigDecimal avg = sum.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
                        kpis.add(new KpiItemDTO("Promedio (" + col + ")", avg.toPlainString(), "Media por registro", "score"));
                    }
                }
                break;
            } else if (colLower.contains("nota") || colLower.contains("calificacion") || colLower.contains("puntaje") || colLower.contains("promedio")) {
                BigDecimal sum = BigDecimal.ZERO;
                int count = 0;
                for (Map<String, Object> fila : filas) {
                    Object val = fila.get(col);
                    if (val instanceof Number n) {
                        sum = sum.add(new BigDecimal(n.toString()));
                        count++;
                    }
                }
                if (count > 0) {
                    BigDecimal avg = sum.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
                    kpis.add(new KpiItemDTO("Promedio Nota", avg.toPlainString(), "Rendimiento general", "score"));
                }
                break;
            }
        }
        return kpis;
    }

    private GraficoConfigDTO deducirGrafico(List<Map<String, Object>> filas, List<String> columnas) {
        if (filas.isEmpty() || columnas.size() < 2) return null;

        // Encontrar una columna textual (ejeX) y una numérica (ejeY)
        String colText = null;
        String colNum = null;

        for (String c : columnas) {
            Object primerVal = filas.get(0).get(c);
            if (primerVal instanceof Number && colNum == null) {
                colNum = c;
            } else if (!(primerVal instanceof Number) && colText == null) {
                colText = c;
            }
        }

        if (colText == null || colNum == null) {
            return null;
        }

        GraficoConfigDTO grafico = new GraficoConfigDTO();
        grafico.setEjeX(colText);
        grafico.setEjeY(colNum);
        grafico.setTipo(filas.size() <= 6 ? "PIE" : "BAR");

        List<Map<String, Object>> series = new ArrayList<>();
        for (Map<String, Object> fila : filas) {
            Object x = fila.get(colText);
            Object y = fila.get(colNum);
            if (x != null && y instanceof Number) {
                series.add(Map.of("label", x.toString(), "value", y));
            }
        }
        grafico.setSeries(series);
        return grafico;
    }

    private String generarTituloReporte(String prompt) {
        String p = prompt.trim();
        if (p.length() > 60) p = p.substring(0, 60) + "...";
        return "Reporte: " + Character.toUpperCase(p.charAt(0)) + p.substring(1);
    }
}
