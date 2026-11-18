package com.ficct.investigacion.ai.convocatoria.harness;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.ai.convocatoria.tools.ConvocatoriaToolExecutor;
import com.ficct.investigacion.ai.convocatoria.tools.ConvocatoriaToolRegistry;
import com.ficct.investigacion.dto.AgenteConvocatoriaDTO.*;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.LlmGatewayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class ConvocatoriaAgentHarness {

    private static final Logger log = LoggerFactory.getLogger(ConvocatoriaAgentHarness.class);
    private static final int MAX_ITERACIONES = 3;

    private final LlmGatewayService llmGatewayService;
    private final ConvocatoriaPromptBuilder promptBuilder;
    private final ConvocatoriaToolRegistry toolRegistry;
    private final ConvocatoriaToolExecutor toolExecutor;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ConvocatoriaAgentHarness(LlmGatewayService llmGatewayService,
                                    ConvocatoriaPromptBuilder promptBuilder,
                                    ConvocatoriaToolRegistry toolRegistry,
                                    ConvocatoriaToolExecutor toolExecutor) {
        this.llmGatewayService = llmGatewayService;
        this.promptBuilder = promptBuilder;
        this.toolRegistry = toolRegistry;
        this.toolExecutor = toolExecutor;
    }

    public String ejecutar(ChatRequest request, ConvocatoriaBorradorDTO borrador, List<User> docentesActivos) {
        if (!llmGatewayService.hasAnyProviderConfigured()) {
            return "El servidor aún no tiene configurada ni LOCAL_AI_URL ni GROQ_API_KEY para activar el Agente IA.";
        }

        try {
            return ejecutarHarnessConTools(request, borrador, docentesActivos);
        } catch (HttpStatusCodeException httpEx) {
            String respBody = httpEx.getResponseBodyAsString();
            log.warn("[ConvocatoriaHarness] Error HTTP ({}): {}. Intentando modo JSON directo...", httpEx.getStatusCode(), respBody);
            try {
                return ejecutarModoJsonDirecto(request, borrador, docentesActivos);
            } catch (Exception retryEx) {
                log.error("[ConvocatoriaHarness] Fallo en fallback JSON directo: {}", retryEx.getMessage(), retryEx);
                return "Tuve un problema temporal al consultar el motor de IA (" + httpEx.getStatusCode().value() + "). Inténtalo nuevamente.";
            }
        } catch (Exception e) {
            log.warn("[ConvocatoriaHarness] Error en tool calling ({}). Intentando modo JSON directo...", e.getMessage());
            try {
                return ejecutarModoJsonDirecto(request, borrador, docentesActivos);
            } catch (Exception retryEx) {
                log.error("[ConvocatoriaHarness] Error definitivo en Agente de Convocatorias: {}", retryEx.getMessage(), retryEx);
                return "Ocurrió un inconveniente al comunicarme con el modelo de IA. Inténtalo de nuevo en unos segundos.";
            }
        }
    }

    private String ejecutarHarnessConTools(ChatRequest request, ConvocatoriaBorradorDTO borrador, List<User> docentesActivos)
            throws Exception {
        String systemPrompt = promptBuilder.construirSystemPrompt(borrador, docentesActivos);
        List<Map<String, Object>> messages = construirHistorialMensajes(systemPrompt, request);
        List<Map<String, Object>> tools = toolRegistry.construirDefinicionTools();

        for (int iter = 0; iter < MAX_ITERACIONES; iter++) {
            Map<String, Object> body = new HashMap<>();
            body.put("messages", messages);
            body.put("tools", tools);
            body.put("tool_choice", "auto");
            body.put("temperature", 0.2);
            body.put("max_tokens", 900);

            JsonNode root = llmGatewayService.chatCompletions(body);
            JsonNode choiceMsg = root.path("choices").get(0).path("message");
            JsonNode toolCalls = choiceMsg.path("tool_calls");

            if (toolCalls.isArray() && !toolCalls.isEmpty()) {
                Map<String, Object> assistantMsg = new HashMap<>();
                assistantMsg.put("role", "assistant");
                assistantMsg.put("tool_calls", objectMapper.convertValue(toolCalls, List.class));
                messages.add(assistantMsg);

                for (JsonNode tc : toolCalls) {
                    String callId = tc.path("id").asText("call_" + iter);
                    String fnName = tc.path("function").path("name").asText();
                    JsonNode argsNode = tc.path("function").path("arguments");
                    String argsRaw = argsNode.isTextual() ? argsNode.asText("{}") : argsNode.toString();

                    String toolOutput = toolExecutor.ejecutarHerramienta(fnName, argsRaw, borrador, docentesActivos);

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
            throws Exception {
        String systemPrompt = promptBuilder.construirSystemPrompt(borrador, docentesActivos) + """

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
        body.put("messages", messages);
        body.put("response_format", Map.of("type", "json_object"));
        body.put("temperature", 0.2);
        body.put("max_tokens", 900);

        JsonNode root = llmGatewayService.chatCompletions(body);
        String rawContent = root.path("choices").get(0).path("message").path("content").asText()
                .replaceAll("(?s)<think>.*?</think>", "").trim();
        JsonNode node = objectMapper.readTree(rawContent);

        if (node.hasNonNull("tipo")) {
            String t = node.get("tipo").asText().trim().toUpperCase(Locale.ROOT);
            if (Set.of("HACKATHON", "FERIA", "CONCURSO", "INVESTIGACION").contains(t)) {
                borrador.setTipo(t);
            }
        }
        if (node.hasNonNull("modalidadInscripcion")) {
            String m = node.get("modalidadInscripcion").asText().trim().toUpperCase(Locale.ROOT);
            if (Set.of("GRUPAL", "INDIVIDUAL").contains(m)) {
                borrador.setModalidadInscripcion(m);
            }
        }
        if (node.hasNonNull("titulo")) borrador.setTitulo(node.get("titulo").asText().trim());
        if (node.hasNonNull("descripcion")) borrador.setDescripcion(node.get("descripcion").asText().trim());
        if (node.hasNonNull("fechaFinInscripcion")) borrador.setFechaFinInscripcion(node.get("fechaFinInscripcion").asText().trim());
        if (node.hasNonNull("cuposMinEquipo")) borrador.setCuposMinEquipo(Math.max(1, node.get("cuposMinEquipo").asInt()));
        if (node.hasNonNull("cuposMaxEquipo")) borrador.setCuposMaxEquipo(Math.max(1, node.get("cuposMaxEquipo").asInt()));
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
}
