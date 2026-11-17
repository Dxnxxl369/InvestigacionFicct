package com.ficct.investigacion.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.AgenteConvocatoriaDTO.*;
import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AgenteConvocatoriaService {

    private static final Logger log = LoggerFactory.getLogger(AgenteConvocatoriaService.class);
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.groq.model:llama-3.1-8b-instant}")
    private String groqModel;

    public AgenteConvocatoriaService(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public ChatResponse procesarMensajeAgente(ChatRequest request) {
        List<User> docentesActivos = userRepository.findAll().stream()
                .filter(u -> u.getRol() == Rol.DOCENTE && u.getEstado() == EstadoUsuario.ACTIVO)
                .toList();

        List<DocenteOpcionDTO> opcionesDocentes = docentesActivos.stream()
                .map(d -> new DocenteOpcionDTO(d.getId(), d.getNombreCompleto(), d.getEmail()))
                .collect(Collectors.toList());

        ConvocatoriaBorradorDTO borrador = clonarBorrador(request.getEstadoActual());

        if (groqApiKey == null || groqApiKey.isBlank()) {
            return construirRespuesta(
                    "El servidor aún no tiene configurada la clave GROQ_API_KEY en Render. Agrégala en las variables de entorno del backend para activar el Agente IA.",
                    borrador, opcionesDocentes
            );
        }

        String mensajeAgente;
        try {
            mensajeAgente = ejecutarHarnessConTools(request, borrador, docentesActivos);
        } catch (HttpStatusCodeException httpEx) {
            String respBody = httpEx.getResponseBodyAsString();
            log.error("Error HTTP de Groq ({}): {}", httpEx.getStatusCode(), respBody);
            if (httpEx.getStatusCode().value() == 404) {
                // Auto-descubrir un modelo habilitado en la cuenta Groq del usuario y reintentar
                String descubierto = descubrirModeloDisponibleEnGroq();
                if (descubierto != null && !descubierto.equals(groqModel)) {
                    log.info(">>> [AgenteConvocatoriaService] Cambiando automáticamente a modelo habilitado en Groq: {}", descubierto);
                    this.groqModel = descubierto;
                    try {
                        mensajeAgente = ejecutarHarnessConTools(request, borrador, docentesActivos);
                        return construirRespuesta(mensajeAgente, borrador, opcionesDocentes);
                    } catch (Exception retryEx) {
                        log.error("Fallo tras auto-descubrir modelo {}: {}", descubierto, retryEx.getMessage());
                    }
                }
            }
            if (httpEx.getStatusCode().value() == 400 && respBody.contains("tool")) {
                // Reintento automático con JSON Object mode si Groq rechaza tool_calls
                try {
                    mensajeAgente = ejecutarModoJsonDirecto(request, borrador, docentesActivos);
                } catch (Exception retryEx) {
                    log.error("Fallo en reintento JSON directo de Groq: {}", retryEx.getMessage(), retryEx);
                    mensajeAgente = "Error al consultar Groq (" + httpEx.getStatusCode().value() + "): " + extraerMensajeErrorGroq(respBody);
                }
            } else {
                mensajeAgente = "Error al consultar Groq (" + httpEx.getStatusCode().value() + "): " + extraerMensajeErrorGroq(respBody);
            }
        } catch (Exception e) {
            log.error("Error ejecutando Harness de Agente IA con Groq (modelo {}): {}", groqModel, e.getMessage(), e);
            mensajeAgente = "Ocurrió un inconveniente al comunicarme con el modelo de IA (" + groqModel + "): " + e.getMessage();
        }

        return construirRespuesta(mensajeAgente, borrador, opcionesDocentes);
    }

    private String extraerMensajeErrorGroq(String body) {
        try {
            JsonNode n = objectMapper.readTree(body);
            String msg = n.path("error").path("message").asText("");
            if (!msg.isBlank()) return msg;
        } catch (Exception ignored) {}
        return body != null && body.length() > 160 ? body.substring(0, 160) : String.valueOf(body);
    }

    private String descubrirModeloDisponibleEnGroq() {
        try {
            HttpEntity<Void> req = new HttpEntity<>(crearHeadersGroq());
            ResponseEntity<String> res = restTemplate.exchange(GROQ_MODELS_URL, HttpMethod.GET, req, String.class);
            if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) return null;
            JsonNode data = objectMapper.readTree(res.getBody()).path("data");
            if (!data.isArray()) return null;

            List<String> disponibles = new ArrayList<>();
            for (JsonNode m : data) {
                String id = m.path("id").asText("");
                String lower = id.toLowerCase(Locale.ROOT);
                // Excluir modelos de audio (whisper) y moderacion (guard)
                if (!id.isBlank() && !lower.contains("whisper") && !lower.contains("guard") && !lower.contains("tts")) {
                    disponibles.add(id);
                }
            }
            List<String> prioridad = List.of(
                    "llama-3.1-8b-instant",
                    "llama-3.3-70b-versatile",
                    "openai/gpt-oss-120b",
                    "openai/gpt-oss-20b",
                    "qwen/qwen3-32b",
                    "meta-llama/llama-4-scout-17b-16e-instruct"
            );
            for (String p : prioridad) {
                if (disponibles.contains(p)) return p;
            }
            return disponibles.isEmpty() ? null : disponibles.get(0);
        } catch (Exception e) {
            log.warn("No se pudo consultar la lista de modelos de Groq: {}", e.getMessage());
            return null;
        }
    }

    private HttpHeaders crearHeadersGroq() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey.trim());
        headers.set("User-Agent", "FICCT-Backend/1.0");
        return headers;
    }

    private List<Map<String, Object>> construirHistorialMensajes(String systemPrompt, ChatRequest request) {
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (request.getHistorial() != null && !request.getHistorial().isEmpty()) {
            int start = Math.max(0, request.getHistorial().size() - 10);
            for (int i = start; i < request.getHistorial().size(); i++) {
                ChatMessage hm = request.getHistorial().get(i);
                if (hm.getTexto() == null || hm.getTexto().isBlank()) continue;
                String role = "AGENTE".equalsIgnoreCase(hm.getRemitente()) ? "assistant" : "user";
                messages.add(Map.of("role", role, "content", hm.getTexto()));
            }
        }
        messages.add(Map.of("role", "user", "content", request.getMensaje()));
        return messages;
    }

    private String construirSystemPrompt(ConvocatoriaBorradorDTO borrador, List<User> docentesActivos)
            throws JsonProcessingException {
        StringBuilder docCatalogo = new StringBuilder();
        for (User d : docentesActivos) {
            docCatalogo.append("- ID ").append(d.getId()).append(": ").append(d.getNombreCompleto())
                    .append(" (").append(d.getEmail()).append(")\n");
        }

        LocalDate hoy = LocalDate.now();
        String estadoJson = objectMapper.writeValueAsString(borrador);

        return """
                Eres el Agente Inteligente de la FICCT (UAGRM) que ayuda a administradores y docentes a diseñar convocatorias académicas (Hackathon, Feria, Concurso o Investigación).
                Fecha actual del sistema: """ + hoy + """
                
                ESTADO ACTUAL DEL BORRADOR:
                """ + estadoJson + """
                
                DOCENTES ACTIVOS DISPONIBLES PARA ASIGNAR:
                """ + (docCatalogo.length() > 0 ? docCatalogo.toString() : "NINGUNO registrado en el sistema.") + """
                
                INSTRUCCIONES DE COMPORTAMIENTO (AGENT HARNESS):
                1. CONVERSACIÓN NATURAL Y CONTEXTO:
                   - Si el usuario solo saluda (ej. "hola", "buenos días") o hace una pregunta general, responde amablemente en español SIN llamar herramientas innecesariamente.
                   - Recuerda el historial de la conversación. Si tú preguntaste por requisitos, fecha o docente en el turno anterior y el usuario responde directamente con los datos (aunque no repita la palabra "requisito" o "fecha"), interpreta su respuesta por contexto y llama a la herramienta adecuada.
                2. USO DE HERRAMIENTAS:
                   - Usa `actualizar_convocatoria` para establecer o modificar tipo, modalidad, título, descripción, fechaFinInscripcion (formato YYYY-MM-DD exacto según el año actual """ + hoy.getYear() + """
                ) o cupos de equipo.
                   - Usa `gestionar_requisitos` cuando el usuario mencione requisitos a agregar, reemplazar o quitar.
                   - Usa `asignar_docente` únicamente cuando el usuario mencione explícitamente a un docente del catálogo.
                3. REGLAS ESTRICTAS:
                   - NUNCA inventes ni agregues requisitos por tu cuenta si el usuario no los dio ni pidió sugerencias.
                   - Si el borrador no tiene requisitos (`requisitos` está vacío), pregunta explícitamente al usuario: "¿Quisieras agregar algunos requisitos para la inscripción?".
                   - NUNCA inventes ni autoasignes docentes que el usuario no haya pedido.
                   - Si el usuario especifica una fecha (ej. "20 de noviembre"), conviértela a YYYY-MM-DD exacto (\"""" + hoy.getYear() + """
                -11-20\") usando `actualizar_convocatoria`.
                4. RESPUESTA FINAL:
                   - Después de ejecutar las herramientas, confirma brevemente lo que actualizaste y pregunta de forma amable solo por los campos que todavía falten en el borrador (fecha límite, requisitos o docente encargado). Responde en máximo 3 líneas claras, sin mostrar JSON ni nombres técnicos internos.
                """;
    }

    private String ejecutarHarnessConTools(ChatRequest request, ConvocatoriaBorradorDTO borrador, List<User> docentesActivos)
            throws JsonProcessingException {

        String systemPrompt = construirSystemPrompt(borrador, docentesActivos);
        List<Map<String, Object>> messages = construirHistorialMensajes(systemPrompt, request);
        List<Map<String, Object>> tools = construirDefinicionTools();
        HttpHeaders headers = crearHeadersGroq();

        for (int iter = 0; iter < 3; iter++) {
            Map<String, Object> body = new HashMap<>();
            body.put("model", groqModel);
            body.put("messages", messages);
            body.put("tools", tools);
            body.put("tool_choice", "auto");
            body.put("temperature", 0.2);
            body.put("max_tokens", 900);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> res = restTemplate.postForEntity(GROQ_URL, entity, String.class);

            if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) {
                throw new IllegalStateException("Groq devolvió estado HTTP " + res.getStatusCode());
            }

            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode choiceMsg = root.path("choices").get(0).path("message");
            JsonNode toolCalls = choiceMsg.path("tool_calls");

            if (toolCalls.isArray() && !toolCalls.isEmpty()) {
                Map<String, Object> assistantMsg = new HashMap<>();
                assistantMsg.put("role", "assistant");
                assistantMsg.put("tool_calls", objectMapper.convertValue(toolCalls, List.class));
                messages.add(assistantMsg);

                for (JsonNode tc : toolCalls) {
                    String callId = tc.path("id").asText();
                    String fnName = tc.path("function").path("name").asText();
                    String argsRaw = tc.path("function").path("arguments").asText("{}");

                    String toolOutput = ejecutarHerramienta(fnName, argsRaw, borrador, docentesActivos);

                    Map<String, Object> toolResultMsg = new HashMap<>();
                    toolResultMsg.put("role", "tool");
                    toolResultMsg.put("tool_call_id", callId);
                    toolResultMsg.put("content", toolOutput);
                    messages.add(toolResultMsg);
                }
                continue;
            }

            String content = choiceMsg.path("content").asText("").replaceAll("(?s)<think>.*?</think>", "").trim();
            if (!content.isEmpty()) {
                return content;
            }
        }

        return "He actualizado el borrador según tus indicaciones. Revisa el panel lateral para verificar los cambios.";
    }

    private String ejecutarModoJsonDirecto(ChatRequest request, ConvocatoriaBorradorDTO borrador, List<User> docentesActivos)
            throws JsonProcessingException {
        String systemPrompt = construirSystemPrompt(borrador, docentesActivos) + """
                
                FORMATO DE SALIDA OBLIGATORIO (JSON):
                Responde ÚNICAMENTE con un JSON válido con esta estructura:
                {
                  "tipo": "HACKATHON" | "FERIA" | "CONCURSO" | "INVESTIGACION" | null,
                  "modalidadInscripcion": "GRUPAL" | "INDIVIDUAL" | null,
                  "titulo": "string o null",
                  "descripcion": "string o null",
                  "fechaFinInscripcion": "YYYY-MM-DD o null",
                  "cuposMinEquipo": integer o null,
                  "cuposMaxEquipo": integer o null,
                  "requisitos": ["solo si el usuario dio requisitos o pidió cambios, sino null"],
                  "selectedDocenteIds": [solo si el usuario nombró docente, sino null],
                  "mensaje": "tu respuesta conversacional amable en español"
                }
                """;

        List<Map<String, Object>> messages = construirHistorialMensajes(systemPrompt, request);
        Map<String, Object> body = new HashMap<>();
        body.put("model", groqModel);
        body.put("messages", messages);
        body.put("response_format", Map.of("type", "json_object"));
        body.put("temperature", 0.2);
        body.put("max_tokens", 900);

        ResponseEntity<String> res = restTemplate.postForEntity(GROQ_URL, new HttpEntity<>(body, crearHeadersGroq()), String.class);
        JsonNode root = objectMapper.readTree(res.getBody());
        String rawContent = root.path("choices").get(0).path("message").path("content").asText();
        JsonNode node = objectMapper.readTree(rawContent);

        if (node.hasNonNull("tipo")) borrador.setTipo(node.get("tipo").asText().toUpperCase(Locale.ROOT));
        if (node.hasNonNull("modalidadInscripcion")) borrador.setModalidadInscripcion(node.get("modalidadInscripcion").asText().toUpperCase(Locale.ROOT));
        if (node.hasNonNull("titulo")) borrador.setTitulo(node.get("titulo").asText());
        if (node.hasNonNull("descripcion")) borrador.setDescripcion(node.get("descripcion").asText());
        if (node.hasNonNull("fechaFinInscripcion")) borrador.setFechaFinInscripcion(node.get("fechaFinInscripcion").asText());
        if (node.hasNonNull("cuposMinEquipo")) borrador.setCuposMinEquipo(node.get("cuposMinEquipo").asInt());
        if (node.hasNonNull("cuposMaxEquipo")) borrador.setCuposMaxEquipo(node.get("cuposMaxEquipo").asInt());
        if (node.hasNonNull("requisitos") && node.get("requisitos").isArray()) {
            List<String> reqs = new ArrayList<>();
            node.get("requisitos").forEach(r -> {
                String t = r.asText().trim();
                if (!t.isEmpty()) reqs.add(t);
            });
            borrador.setRequisitos(reqs);
        }
        if (node.hasNonNull("selectedDocenteIds") && node.get("selectedDocenteIds").isArray()) {
            Set<Long> validIds = docentesActivos.stream().map(User::getId).collect(Collectors.toSet());
            List<Long> ids = new ArrayList<>();
            node.get("selectedDocenteIds").forEach(n -> {
                if (validIds.contains(n.asLong())) ids.add(n.asLong());
            });
            borrador.setSelectedDocenteIds(ids);
        }
        return node.path("mensaje").asText("He actualizado el borrador según tus indicaciones.");
    }

    private String ejecutarHerramienta(String fnName, String argsRaw,
                                       ConvocatoriaBorradorDTO borrador, List<User> docentesActivos) {
        try {
            JsonNode args = objectMapper.readTree(argsRaw);
            switch (fnName) {
                case "actualizar_convocatoria" -> {
                    if (args.hasNonNull("tipo")) {
                        String tipo = args.get("tipo").asText().trim().toUpperCase(Locale.ROOT);
                        if (Set.of("HACKATHON", "FERIA", "CONCURSO", "INVESTIGACION").contains(tipo)) {
                            borrador.setTipo(tipo);
                        }
                    }
                    if (args.hasNonNull("modalidadInscripcion")) {
                        String mod = args.get("modalidadInscripcion").asText().trim().toUpperCase(Locale.ROOT);
                        if (Set.of("GRUPAL", "INDIVIDUAL").contains(mod)) {
                            borrador.setModalidadInscripcion(mod);
                        }
                    }
                    if (args.hasNonNull("titulo")) {
                        borrador.setTitulo(args.get("titulo").asText().trim());
                    }
                    if (args.hasNonNull("descripcion")) {
                        borrador.setDescripcion(args.get("descripcion").asText().trim());
                    }
                    if (args.has("fechaFinInscripcion") && !args.get("fechaFinInscripcion").isNull()) {
                        borrador.setFechaFinInscripcion(args.get("fechaFinInscripcion").asText().trim());
                    }
                    if (args.hasNonNull("cuposMinEquipo")) {
                        borrador.setCuposMinEquipo(Math.max(1, args.get("cuposMinEquipo").asInt()));
                    }
                    if (args.hasNonNull("cuposMaxEquipo")) {
                        borrador.setCuposMaxEquipo(Math.max(1, args.get("cuposMaxEquipo").asInt()));
                    }
                }
                case "gestionar_requisitos" -> {
                    String accion = args.path("accion").asText("AGREGAR").toUpperCase(Locale.ROOT);
                    List<String> actuales = borrador.getRequisitos() != null
                            ? new ArrayList<>(borrador.getRequisitos())
                            : new ArrayList<>();
                    List<String> items = new ArrayList<>();
                    if (args.has("requisitos") && args.get("requisitos").isArray()) {
                        args.get("requisitos").forEach(n -> {
                            String txt = n.asText().trim();
                            if (!txt.isEmpty()) items.add(txt);
                        });
                    }
                    switch (accion) {
                        case "REEMPLAZAR" -> actuales = items;
                        case "LIMPIAR" -> actuales.clear();
                        case "ELIMINAR" -> {
                            Set<String> lowerDel = items.stream().map(s -> s.toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
                            actuales.removeIf(r -> lowerDel.contains(r.toLowerCase(Locale.ROOT)));
                        }
                        default -> {
                            for (String item : items) {
                                boolean existe = actuales.stream().anyMatch(r -> r.equalsIgnoreCase(item));
                                if (!existe) actuales.add(item);
                            }
                        }
                    }
                    borrador.setRequisitos(actuales);
                }
                case "asignar_docente" -> {
                    Set<Long> validIds = docentesActivos.stream().map(User::getId).collect(Collectors.toSet());
                    List<Long> nuevosIds = new ArrayList<>();
                    if (args.has("docenteIds") && args.get("docenteIds").isArray()) {
                        args.get("docenteIds").forEach(idNode -> {
                            long id = idNode.asLong();
                            if (validIds.contains(id) && !nuevosIds.contains(id)) {
                                nuevosIds.add(id);
                            }
                        });
                    }
                    borrador.setSelectedDocenteIds(nuevosIds);
                }
                default -> log.warn("Herramienta desconocida solicitada por el modelo: {}", fnName);
            }
            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "estadoActualizado", borrador
            ));
        } catch (Exception e) {
            log.warn("Error ejecutando tool {}: {}", fnName, e.getMessage());
            return "{\"ok\":false,\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    private List<Map<String, Object>> construirDefinicionTools() {
        Map<String, Object> toolActualizar = Map.of(
                "type", "function",
                "function", Map.of(
                        "name", "actualizar_convocatoria",
                        "description", "Actualiza uno o más campos generales de la convocatoria en borrador. Envía únicamente los campos que el usuario pidió establecer o cambiar.",
                        "parameters", Map.of(
                                "type", "object",
                                "required", List.of(),
                                "properties", Map.of(
                                        "tipo", Map.of("type", "string", "enum", List.of("HACKATHON", "FERIA", "CONCURSO", "INVESTIGACION")),
                                        "modalidadInscripcion", Map.of("type", "string", "enum", List.of("GRUPAL", "INDIVIDUAL")),
                                        "titulo", Map.of("type", "string", "description", "Título formal y claro del evento"),
                                        "descripcion", Map.of("type", "string", "description", "Descripción de objetivos y alcance"),
                                        "fechaFinInscripcion", Map.of("type", "string", "description", "Fecha límite de inscripción en formato YYYY-MM-DD"),
                                        "cuposMinEquipo", Map.of("type", "integer"),
                                        "cuposMaxEquipo", Map.of("type", "integer")
                                )
                        )
                )
        );

        Map<String, Object> toolRequisitos = Map.of(
                "type", "function",
                "function", Map.of(
                        "name", "gestionar_requisitos",
                        "description", "Agrega, reemplaza, elimina o limpia la lista de requisitos de inscripción de la convocatoria.",
                        "parameters", Map.of(
                                "type", "object",
                                "required", List.of("accion"),
                                "properties", Map.of(
                                        "accion", Map.of("type", "string", "enum", List.of("AGREGAR", "REEMPLAZAR", "ELIMINAR", "LIMPIAR")),
                                        "requisitos", Map.of("type", "array", "items", Map.of("type", "string"))
                                )
                        )
                )
        );

        Map<String, Object> toolDocente = Map.of(
                "type", "function",
                "function", Map.of(
                        "name", "asignar_docente",
                        "description", "Asigna uno o varios IDs de docentes encargados del catálogo disponible.",
                        "parameters", Map.of(
                                "type", "object",
                                "required", List.of("docenteIds"),
                                "properties", Map.of(
                                        "docenteIds", Map.of("type", "array", "items", Map.of("type", "integer"))
                                )
                        )
                )
        );

        return List.of(toolActualizar, toolRequisitos, toolDocente);
    }

    private ConvocatoriaBorradorDTO clonarBorrador(ConvocatoriaBorradorDTO origen) {
        ConvocatoriaBorradorDTO b = new ConvocatoriaBorradorDTO();
        if (origen == null) {
            b.setRequisitos(new ArrayList<>());
            b.setSelectedDocenteIds(new ArrayList<>());
            return b;
        }
        b.setTipo(origen.getTipo());
        b.setModalidadInscripcion(origen.getModalidadInscripcion());
        b.setTitulo(origen.getTitulo());
        b.setDescripcion(origen.getDescripcion());
        b.setFechaFinInscripcion(origen.getFechaFinInscripcion());
        b.setCuposMinEquipo(origen.getCuposMinEquipo());
        b.setCuposMaxEquipo(origen.getCuposMaxEquipo());
        b.setRequisitos(origen.getRequisitos() != null ? new ArrayList<>(origen.getRequisitos()) : new ArrayList<>());
        b.setSelectedDocenteIds(origen.getSelectedDocenteIds() != null ? new ArrayList<>(origen.getSelectedDocenteIds()) : new ArrayList<>());
        return b;
    }

    private ChatResponse construirRespuesta(String mensajeAgente, ConvocatoriaBorradorDTO actualizado,
                                            List<DocenteOpcionDTO> opcionesDocentes) {
        List<String> faltantes = new ArrayList<>();
        int puntos = 0;

        if (actualizado.getTitulo() != null && !actualizado.getTitulo().isBlank()) puntos += 20;
        else faltantes.add("Título de la convocatoria");

        if (actualizado.getDescripcion() != null && !actualizado.getDescripcion().isBlank()) puntos += 20;
        else faltantes.add("Descripción de objetivos");

        if (actualizado.getTipo() != null && !actualizado.getTipo().isBlank()) puntos += 15;
        if (actualizado.getFechaFinInscripcion() != null && !actualizado.getFechaFinInscripcion().isBlank()) puntos += 20;
        else faltantes.add("Fecha límite de inscripción");

        if (actualizado.getRequisitos() != null && !actualizado.getRequisitos().isEmpty()) puntos += 10;
        else faltantes.add("Requisitos de participación");

        if (actualizado.getSelectedDocenteIds() != null && !actualizado.getSelectedDocenteIds().isEmpty()) puntos += 15;
        else faltantes.add("Docente encargado asignado");

        ChatResponse response = new ChatResponse();
        response.setMensajeAgente(mensajeAgente);
        response.setBorradorActualizado(actualizado);
        response.setCamposFaltantes(faltantes);
        response.setDocentesDisponibles(opcionesDocentes);
        response.setPorcentajeProgreso(Math.min(100, puntos));
        return response;
    }
}
