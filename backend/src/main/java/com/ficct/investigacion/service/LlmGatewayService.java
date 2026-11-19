package com.ficct.investigacion.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Puerta de enlace unificada para modelos LLM OpenAI-compatible.
 * Intenta primero el servidor local configurado (LOCAL_AI_URL / Ollama en PC via tunel)
 * con timeout rapido y hace fallback automatico a Groq si la PC o el tunel no estan disponibles.
 */
@Service
public class LlmGatewayService {

    private static final Logger log = LoggerFactory.getLogger(LlmGatewayService.class);
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate groqRestTemplate = new RestTemplate();

    @Value("${app.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.groq.model:llama-3.1-8b-instant}")
    private String groqModel;

    @Value("${app.local-ai.url:}")
    private String localAiUrl;

    @Value("${app.local-ai.model:qwen2.5:3b}")
    private String localAiModel;

    @Value("${app.local-ai.token:}")
    private String localAiToken;

    @Value("${app.local-ai.connect-timeout-ms:2500}")
    private int localConnectTimeoutMs;

    @Value("${app.local-ai.read-timeout-ms:25000}")
    private int localReadTimeoutMs;

    public boolean hasAnyProviderConfigured() {
        return hasLocalAi() || hasGroq();
    }

    public boolean hasLocalAi() {
        return localAiUrl != null && !localAiUrl.isBlank();
    }

    public boolean hasGroq() {
        return groqApiKey != null && !groqApiKey.isBlank();
    }

    public String getActiveGroqModel() {
        return groqModel;
    }

    /**
     * Envia una peticion chat/completions. Prioriza LOCAL_AI_URL si esta configurada,
     * y ante cualquier fallo de conexion/timeout/5xx hace fallback transparente a Groq.
     */
    public JsonNode chatCompletions(Map<String, Object> payloadBase) throws Exception {
        if (hasLocalAi()) {
            try {
                return llamarLocalAi(payloadBase);
            } catch (Exception localEx) {
                log.warn("[LlmGateway] Modelo local no disponible ({}). Haciendo fallback automatico a Groq.", localEx.getMessage());
                if (!hasGroq()) {
                    throw localEx;
                }
            }
        }

        if (!hasGroq()) {
            throw new IllegalStateException("No hay proveedor IA configurado (ni LOCAL_AI_URL ni GROQ_API_KEY).");
        }

        return llamarGroqConAutoDiscovery(payloadBase);
    }

    private JsonNode llamarLocalAi(Map<String, Object> payloadBase) throws Exception {
        String endpoint = normalizarUrlChatCompletions(localAiUrl);
        Map<String, Object> localBody = new HashMap<>(payloadBase);
        localBody.put("model", (localAiModel != null && !localAiModel.isBlank()) ? localAiModel.trim() : "qwen2.5:3b");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (localAiToken != null && !localAiToken.isBlank()) {
            headers.setBearerAuth(localAiToken.trim());
        }

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(localConnectTimeoutMs);
        factory.setReadTimeout(localReadTimeoutMs);
        RestTemplate localRest = new RestTemplate(factory);

        ResponseEntity<String> res = localRest.postForEntity(endpoint, new HttpEntity<>(localBody, headers), String.class);
        if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) {
            throw new IllegalStateException("Local AI devolvio estado " + res.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(res.getBody());
        if (!root.path("choices").isArray() || root.path("choices").isEmpty()) {
            throw new IllegalStateException("Local AI devolvio respuesta sin choices");
        }
        log.info("[LlmGateway] Respuesta atendida por modelo LOCAL ({})", localBody.get("model"));
        return root;
    }

    private JsonNode llamarGroqConAutoDiscovery(Map<String, Object> payloadBase) throws Exception {
        Map<String, Object> groqBody = new HashMap<>(payloadBase);
        groqBody.put("model", groqModel);
        HttpHeaders headers = crearHeadersGroq();

        try {
            ResponseEntity<String> res = groqRestTemplate.postForEntity(GROQ_URL, new HttpEntity<>(groqBody, headers), String.class);
            if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) {
                throw new IllegalStateException("Groq devolvio estado " + res.getStatusCode());
            }
            return objectMapper.readTree(res.getBody());
        } catch (HttpStatusCodeException httpEx) {
            if (httpEx.getStatusCode().value() == 404) {
                String descubierto = descubrirModeloGroq();
                if (descubierto != null && !descubierto.equals(groqModel)) {
                    log.info("[LlmGateway] Cambiando modelo Groq a {}", descubierto);
                    this.groqModel = descubierto;
                    groqBody.put("model", descubierto);
                    ResponseEntity<String> retry = groqRestTemplate.postForEntity(GROQ_URL, new HttpEntity<>(groqBody, headers), String.class);
                    return objectMapper.readTree(retry.getBody());
                }
            }
            throw httpEx;
        }
    }

    private String normalizarUrlChatCompletions(String rawUrl) {
        String clean = rawUrl.trim();
        while (clean.endsWith("/")) {
            clean = clean.substring(0, clean.length() - 1);
        }
        if (clean.endsWith("/v1/chat/completions")) {
            return clean;
        }
        if (clean.endsWith("/v1")) {
            return clean + "/chat/completions";
        }
        return clean + "/v1/chat/completions";
    }

    private HttpHeaders crearHeadersGroq() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey.trim());
        return headers;
    }

    private String descubrirModeloGroq() {
        try {
            ResponseEntity<String> res = groqRestTemplate.exchange(
                    GROQ_MODELS_URL, HttpMethod.GET, new HttpEntity<>(crearHeadersGroq()), String.class);
            JsonNode data = objectMapper.readTree(res.getBody()).path("data");
            if (data.isArray()) {
                List<String> disponibles = new java.util.ArrayList<>();
                for (JsonNode m : data) {
                    String id = m.path("id").asText("");
                    String lower = id.toLowerCase(java.util.Locale.ROOT);
                    if (!id.isBlank()
                            && !lower.contains("whisper")
                            && !lower.contains("guard")
                            && !lower.contains("tts")
                            && !lower.contains("orpheus")
                            && !lower.contains("playai")
                            && !lower.contains("speech")
                            && !lower.contains("audio")) {
                        disponibles.add(id);
                    }
                }
                List<String> preferidos = List.of(
                        "llama-3.1-8b-instant",
                        "llama-3.3-70b-versatile",
                        "openai/gpt-oss-120b",
                        "openai/gpt-oss-20b",
                        "qwen/qwen3-32b",
                        "meta-llama/llama-4-scout-17b-16e-instruct",
                        "gemma2-9b-it"
                );
                for (String pref : preferidos) {
                    if (disponibles.contains(pref)) return pref;
                }
                return disponibles.isEmpty() ? null : disponibles.get(0);
            }
        } catch (Exception e) {
            log.warn("[LlmGateway] No se pudo listar modelos Groq: {}", e.getMessage());
        }
        return null;
    }
}
