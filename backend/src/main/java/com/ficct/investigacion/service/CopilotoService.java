package com.ficct.investigacion.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.ai.harness.CopilotoPromptBuilder;
import com.ficct.investigacion.ai.tools.CopilotoToolExecutor;
import com.ficct.investigacion.ai.tools.CopilotoToolRegistry;
import com.ficct.investigacion.dto.CopilotoDTO.*;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.*;

@Service
public class CopilotoService {

    private static final Logger log = LoggerFactory.getLogger(CopilotoService.class);
    private static final int MAX_ITERACIONES = 3;
    private static final List<String> RAMAS_VALIDAS = List.of(
            "AULAS_TAREAS", "CONVOCATORIAS", "GRUPOS_INSCRIPCIONES",
            "JURADOS_REPORTES", "BIBLIOTECA_USUARIOS_CHARLA", "CHARLA"
    );

    private final UserRepository userRepository;
    private final LlmGatewayService llmGatewayService;
    private final CopilotoPromptBuilder promptBuilder;
    private final CopilotoToolRegistry toolRegistry;
    private final CopilotoToolExecutor toolExecutor;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CopilotoService(UserRepository userRepository,
                           LlmGatewayService llmGatewayService,
                           CopilotoPromptBuilder promptBuilder,
                           CopilotoToolRegistry toolRegistry,
                           CopilotoToolExecutor toolExecutor) {
        this.userRepository = userRepository;
        this.llmGatewayService = llmGatewayService;
        this.promptBuilder = promptBuilder;
        this.toolRegistry = toolRegistry;
        this.toolExecutor = toolExecutor;
    }

    @Transactional(readOnly = true)
    public CopilotoResponse procesarMensaje(CopilotoRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        CopilotoResponse response = new CopilotoResponse();

        if (!llmGatewayService.hasAnyProviderConfigured()) {
            response.setMensaje("El servidor no tiene configurada ni LOCAL_AI_URL ni GROQ_API_KEY para el Copiloto IA.");
            return response;
        }

        try {
            String reply = ejecutarHarnessCopiloto(request, user, response);
            response.setMensaje(reply);
        } catch (HttpStatusCodeException httpEx) {
            log.error("Error HTTP en Copiloto ({}): {}", httpEx.getStatusCode(), httpEx.getResponseBodyAsString());
            response.setMensaje("Tuve un problema temporal al consultar el motor de IA. Inténtalo nuevamente en unos segundos.");
        } catch (Exception e) {
            log.error("Error en CopilotoService: {}", e.getMessage(), e);
            response.setMensaje("Ocurrió un inconveniente al procesar tu solicitud. Inténtalo de nuevo.");
        }

        return response;
    }

    private String ejecutarHarnessCopiloto(CopilotoRequest request, User user, CopilotoResponse response) throws Exception {
        String rama = clasificarRama(request, user);
        String systemPrompt = promptBuilder.construirSystemPromptPorRama(user, request.getRutaActual(), rama);
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (request.getHistorial() != null && !request.getHistorial().isEmpty()) {
            int start = Math.max(0, request.getHistorial().size() - 6);
            for (int i = start; i < request.getHistorial().size(); i++) {
                ChatMessage hm = request.getHistorial().get(i);
                if (hm.getTexto() == null || hm.getTexto().isBlank()) continue;
                String role = "COPILOTO".equalsIgnoreCase(hm.getRemitente()) ? "assistant" : "user";
                messages.add(Map.of("role", role, "content", hm.getTexto()));
            }
        }
        messages.add(Map.of("role", "user", "content", request.getMensaje()));

        List<Map<String, Object>> tools = toolRegistry.obtenerToolsPorRamaYRol(rama, user.getRol());
        boolean yaEjecutoTool = false;

        for (int iter = 0; iter < MAX_ITERACIONES; iter++) {
            Map<String, Object> body = new HashMap<>();
            body.put("messages", messages);
            if (!yaEjecutoTool && !tools.isEmpty()) {
                body.put("tools", tools);
                body.put("tool_choice", "auto");
            }
            body.put("temperature", 0.2);
            body.put("max_tokens", 550);

            JsonNode root = llmGatewayService.chatCompletions(body);
            JsonNode choiceMsg = root.path("choices").get(0).path("message");
            JsonNode toolCalls = choiceMsg.path("tool_calls");

            if (!yaEjecutoTool && toolCalls.isArray() && !toolCalls.isEmpty()) {
                Map<String, Object> assistantMsg = new HashMap<>();
                assistantMsg.put("role", "assistant");
                assistantMsg.put("tool_calls", objectMapper.convertValue(toolCalls, List.class));
                messages.add(assistantMsg);

                for (JsonNode tc : toolCalls) {
                    String callId = tc.path("id").asText("call_" + iter);
                    String fnName = tc.path("function").path("name").asText();
                    JsonNode argsNode = tc.path("function").path("arguments");
                    String argsRaw = argsNode.isTextual() ? argsNode.asText("{}") : argsNode.toString();

                    String output = toolExecutor.ejecutar(fnName, argsRaw, user, request.getRutaActual(), response);

                    Map<String, Object> toolMsg = new HashMap<>();
                    toolMsg.put("role", "tool");
                    toolMsg.put("tool_call_id", callId);
                    toolMsg.put("content", output);
                    messages.add(toolMsg);
                }
                yaEjecutoTool = true;
                continue;
            }

            String content = choiceMsg.path("content").asText("").replaceAll("(?s)<think>.*?</think>", "").trim();
            if (!content.isEmpty()) return content;
        }

        return "¿En qué actividad o módulo te gustaría trabajar ahora?";
    }

    private String clasificarRama(CopilotoRequest request, User user) {
        String msg = request.getMensaje() != null ? request.getMensaje().toLowerCase(Locale.ROOT).trim() : "";
        if (msg.isBlank() || msg.matches("^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|gracias|ok|listo|ayuda|qu[eé] puedes hacer).*")) {
            return "CHARLA";
        }
        if (msg.contains("reporte") || msg.contains("pdf") || msg.contains("jurado") || msg.contains("evaluaci") || msg.contains("resum")) {
            return "JURADOS_REPORTES";
        }
        if (msg.contains("biblioteca") || msg.contains("usuario") || msg.contains("notificaci") || msg.contains("ir a ") || msg.contains("ll[eé]vame") || msg.contains("llévame")) {
            return "BIBLIOTECA_USUARIOS_CHARLA";
        }
        if (msg.contains("grupo") || msg.contains("equipo") || msg.contains("inscripci") || msg.contains("postulan")) {
            return "GRUPOS_INSCRIPCIONES";
        }
        if (msg.contains("convocatoria") || msg.contains("feria") || msg.contains("hackathon") || msg.contains("concurso") || msg.contains("plantilla")) {
            return "CONVOCATORIAS";
        }
        if (msg.contains("tarea") || msg.contains("pendiente") || msg.contains("entrega") || msg.contains("aula") || msg.contains("módulo") || msg.contains("modulo") || msg.contains("nota")) {
            return "AULAS_TAREAS";
        }

        try {
            Map<String, Object> clsBody = new HashMap<>();
            clsBody.put("messages", List.of(
                    Map.of("role", "system", "content", promptBuilder.construirPromptClasificador(user, request.getRutaActual())),
                    Map.of("role", "user", "content", request.getMensaje())
            ));
            clsBody.put("temperature", 0.0);
            clsBody.put("max_tokens", 20);
            JsonNode clsRoot = llmGatewayService.chatCompletions(clsBody);
            String raw = clsRoot.path("choices").path(0).path("message").path("content").asText("")
                    .toUpperCase(Locale.ROOT).trim();
            for (String r : RAMAS_VALIDAS) {
                if (raw.contains(r)) return r;
            }
        } catch (Exception e) {
            log.debug("[Copiloto] Clasificador ligero fallback: {}", e.getMessage());
        }
        return "AULAS_TAREAS";
    }
}
