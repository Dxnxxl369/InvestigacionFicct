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
    private static final int MAX_ITERACIONES = 4;

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
        String systemPrompt = promptBuilder.construirSystemPrompt(user, request.getRutaActual());
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (request.getHistorial() != null && !request.getHistorial().isEmpty()) {
            int start = Math.max(0, request.getHistorial().size() - 8);
            for (int i = start; i < request.getHistorial().size(); i++) {
                ChatMessage hm = request.getHistorial().get(i);
                if (hm.getTexto() == null || hm.getTexto().isBlank()) continue;
                String role = "COPILOTO".equalsIgnoreCase(hm.getRemitente()) ? "assistant" : "user";
                messages.add(Map.of("role", role, "content", hm.getTexto()));
            }
        }
        messages.add(Map.of("role", "user", "content", request.getMensaje()));

        List<Map<String, Object>> tools = toolRegistry.obtenerDefinicionTools();

        for (int iter = 0; iter < MAX_ITERACIONES; iter++) {
            Map<String, Object> body = new HashMap<>();
            body.put("messages", messages);
            body.put("tools", tools);
            body.put("tool_choice", "auto");
            body.put("temperature", 0.2);
            body.put("max_tokens", 700);

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

                    String output = toolExecutor.ejecutar(fnName, argsRaw, user, request.getRutaActual(), response);

                    Map<String, Object> toolMsg = new HashMap<>();
                    toolMsg.put("role", "tool");
                    toolMsg.put("tool_call_id", callId);
                    toolMsg.put("content", output);
                    messages.add(toolMsg);
                }
                continue;
            }

            String content = choiceMsg.path("content").asText("").replaceAll("(?s)<think>.*?</think>", "").trim();
            if (!content.isEmpty()) return content;
        }

        return "¿En qué actividad o módulo te gustaría trabajar ahora?";
    }
}
