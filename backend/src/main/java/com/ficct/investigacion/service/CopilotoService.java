package com.ficct.investigacion.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.CopilotoDTO.*;
import com.ficct.investigacion.dto.EntregaTareaDTO;
import com.ficct.investigacion.dto.TareaDTO;
import com.ficct.investigacion.model.EstadoEntrega;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class CopilotoService {

    private static final Logger log = LoggerFactory.getLogger(CopilotoService.class);
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

    private final UserRepository userRepository;
    private final ConvocatoriaService convocatoriaService;
    private final TareaService tareaService;
    private final EvaluacionJuradoService evaluacionJuradoService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.groq.model:llama-3.1-8b-instant}")
    private String groqModel;

    public CopilotoService(UserRepository userRepository,
                           ConvocatoriaService convocatoriaService,
                           TareaService tareaService,
                           EvaluacionJuradoService evaluacionJuradoService) {
        this.userRepository = userRepository;
        this.convocatoriaService = convocatoriaService;
        this.tareaService = tareaService;
        this.evaluacionJuradoService = evaluacionJuradoService;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @Transactional(readOnly = true)
    public CopilotoResponse procesarMensaje(CopilotoRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        CopilotoResponse response = new CopilotoResponse();

        if (groqApiKey == null || groqApiKey.isBlank()) {
            response.setMensaje("El servidor no tiene configurada la clave GROQ_API_KEY para el Copiloto IA.");
            return response;
        }

        try {
            String reply = ejecutarHarnessCopiloto(request, user, response);
            response.setMensaje(reply);
        } catch (HttpStatusCodeException httpEx) {
            String respBody = httpEx.getResponseBodyAsString();
            log.error("Error HTTP de Groq en Copiloto ({}): {}", httpEx.getStatusCode(), respBody);
            if (httpEx.getStatusCode().value() == 404) {
                String descubierto = descubrirModeloDisponible();
                if (descubierto != null && !descubierto.equals(groqModel)) {
                    this.groqModel = descubierto;
                    try {
                        String reply = ejecutarHarnessCopiloto(request, user, response);
                        response.setMensaje(reply);
                        return response;
                    } catch (Exception ignored) {}
                }
            }
            response.setMensaje("Tuve un problema temporal al consultar el motor de IA. Inténtalo nuevamente en unos segundos.");
        } catch (Exception e) {
            log.error("Error en CopilotoService: {}", e.getMessage(), e);
            response.setMensaje("Ocurrió un inconveniente al procesar tu solicitud. Inténtalo de nuevo.");
        }

        return response;
    }

    private String ejecutarHarnessCopiloto(CopilotoRequest request, User user, CopilotoResponse response) throws Exception {
        String systemPrompt = construirSystemPrompt(user, request.getRutaActual());
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

        List<Map<String, Object>> tools = construirTools();
        HttpHeaders headers = crearHeaders();

        for (int iter = 0; iter < 3; iter++) {
            Map<String, Object> body = new HashMap<>();
            body.put("model", groqModel);
            body.put("messages", messages);
            body.put("tools", tools);
            body.put("tool_choice", "auto");
            body.put("temperature", 0.2);
            body.put("max_tokens", 700);

            ResponseEntity<String> res = restTemplate.postForEntity(GROQ_URL, new HttpEntity<>(body, headers), String.class);
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

                    String output = ejecutarTool(fnName, argsRaw, user, response);

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

    private String ejecutarTool(String fnName, String argsRaw, User user, CopilotoResponse response) {
        try {
            JsonNode args = objectMapper.readTree(argsRaw);
            switch (fnName) {
                case "consultar_mis_aulas_y_pendientes" -> {
                    List<Map<String, Object>> resumenAulas = consultarAulasSeguras(user, response);
                    long totalPendientes = resumenAulas.stream()
                            .mapToLong(a -> {
                                Object val = a.containsKey("pendientes") ? a.get("pendientes") : a.get("pendientesPorEvaluar");
                                return val instanceof Number n ? n.longValue() : 0L;
                            })
                            .sum();
                    return objectMapper.writeValueAsString(Map.of(
                            "ok", true,
                            "rol", user.getRol().name(),
                            "totalAulas", resumenAulas.size(),
                            "totalPendientes", totalPendientes,
                            "aulas", resumenAulas
                    ));
                }
                case "navegar_a" -> {
                    String ruta = args.path("ruta").asText("").trim();
                    String validacion = validarRutaSegunRol(ruta, user);
                    if (validacion != null) {
                        return objectMapper.writeValueAsString(Map.of("ok", false, "error", validacion));
                    }
                    response.setAccion("NAVEGAR");
                    response.setRutaDestino(ruta);
                    return objectMapper.writeValueAsString(Map.of("ok", true, "navegandoA", ruta));
                }
                case "abrir_agente_convocatorias" -> {
                    if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
                        return "{\"ok\":false,\"error\":\"Solo docentes y administradores pueden crear o diseñar convocatorias con el Agente IA.\"}";
                    }
                    String prompt = args.path("promptInicial").asText("").trim();
                    response.setAccion("ABRIR_AGENTE_CONVOCATORIA");
                    response.setMensajeInicialAgente(prompt);
                    return "{\"ok\":true,\"mensaje\":\"Transfiriendo al Agente IA de Convocatorias\"}";
                }
                default -> {
                    return "{\"ok\":false,\"error\":\"Herramienta desconocida\"}";
                }
            }
        } catch (Exception e) {
            log.warn("Error en tool {} del copiloto: {}", fnName, e.getMessage());
            return "{\"ok\":false,\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    private List<Map<String, Object>> consultarAulasSeguras(User user, CopilotoResponse response) {
        List<Map<String, Object>> resultado = new ArrayList<>();
        List<OpcionNavegacion> opciones = new ArrayList<>();
        Rol rol = user.getRol();
        String email = user.getEmail();

        if (rol == Rol.JURADO) {
            var grupos = evaluacionJuradoService.misGrupos(email);
            Map<Long, List<EvaluacionJuradoService.GrupoAsignado>> porConv = new LinkedHashMap<>();
            for (var g : grupos) {
                porConv.computeIfAbsent(g.convocatoriaId(), k -> new ArrayList<>()).add(g);
            }
            for (var entry : porConv.entrySet()) {
                long pendientes = entry.getValue().stream().filter(g -> !g.evaluado()).count();
                String titulo = entry.getValue().get(0).convocatoriaTitulo();
                String ruta = "/dashboard/jurado";
                resultado.add(Map.of(
                        "titulo", titulo,
                        "pendientesPorEvaluar", pendientes,
                        "totalGrupos", entry.getValue().size(),
                        "ruta", ruta
                ));
                opciones.add(new OpcionNavegacion(
                        titulo,
                        "Evaluación de Jurado · " + entry.getValue().size() + " grupos",
                        ruta,
                        pendientes + (pendientes == 1 ? " pendiente" : " pendientes"),
                        "NAVEGAR"
                ));
            }
        } else {
            List<ConvocatoriaDTO> areas = convocatoriaService.listarMisAreas(email);
            for (ConvocatoriaDTO area : areas) {
                List<TareaDTO> tareasArea = tareaService.listarPorConvocatoria(area.getId(), email);
                long pendientes = 0;

                if (rol == Rol.ESTUDIANTE) {
                    pendientes = tareasArea.stream()
                            .filter(t -> t.isHabilitada() && t.getMiEntrega() == null)
                            .count();
                } else {
                    // DOCENTE o ADMIN: contar entregas enviadas esperando calificación
                    for (TareaDTO t : tareasArea) {
                        try {
                            List<EntregaTareaDTO> entregas = tareaService.listarEntregasPorTarea(t.getId(), email);
                            pendientes += entregas.stream()
                                    .filter(e -> e.getEstado() == EstadoEntrega.ENTREGADO)
                                    .count();
                        } catch (Exception ignored) {}
                    }
                }

                String ruta = "/dashboard/convocatorias/" + area.getId() + "?tab=tareas";
                String etiquetaPendiente = rol == Rol.ESTUDIANTE
                        ? pendientes + (pendientes == 1 ? " tarea pendiente" : " tareas pendientes")
                        : pendientes + (pendientes == 1 ? " entrega por calificar" : " entregas por calificar");

                resultado.add(Map.of(
                        "titulo", area.getTitulo(),
                        "tipo", area.getTipo().name(),
                        "estado", area.getEstado().name(),
                        "pendientes", pendientes,
                        "ruta", ruta
                ));

                opciones.add(new OpcionNavegacion(
                        area.getTitulo(),
                        area.getTipo().name() + " · " + tareasArea.size() + " tareas",
                        ruta,
                        etiquetaPendiente,
                        "NAVEGAR"
                ));
            }
        }

        if (!opciones.isEmpty()) {
            response.setOpciones(opciones);
            if (!"NAVEGAR".equals(response.getAccion())) {
                response.setAccion("MOSTRAR_OPCIONES");
            }
        }
        return resultado;
    }

    private String validarRutaSegunRol(String ruta, User user) {
        if (ruta.isBlank() || !ruta.startsWith("/dashboard")) {
            return "Ruta inválida.";
        }
        Rol rol = user.getRol();
        if (ruta.startsWith("/dashboard/usuarios") && rol != Rol.ADMIN) {
            return "No tienes permisos para acceder a Gestión de Usuarios (solo Administradores).";
        }
        if ((ruta.startsWith("/dashboard/reportes") || ruta.startsWith("/dashboard/plantillas") || ruta.startsWith("/dashboard/convocatorias/nueva"))
                && rol != Rol.ADMIN && rol != Rol.DOCENTE) {
            return "No tienes permisos para acceder a esa sección (exclusiva para Docentes y Administradores).";
        }
        if (ruta.startsWith("/dashboard/jurado") && rol != Rol.JURADO && rol != Rol.ADMIN) {
            return "Esa sección es exclusiva para Jurados evaluadores.";
        }
        if (ruta.startsWith("/dashboard/mis-pendientes") && rol != Rol.ESTUDIANTE) {
            return "Mis Pendientes es vista de estudiante; usa consultar_mis_aulas_y_pendientes para ver tus aulas.";
        }
        return null;
    }

    private String construirSystemPrompt(User user, String rutaActual) {
        return """
                Eres el Copiloto IA de la plataforma FICCT - UAGRM.
                Usuario actual: %s %s | Rol: %s | Ruta actual: %s

                TU PERSONALIDAD Y ESTILO:
                - Responde siempre en español natural, cordial, puntual y directo (máximo 2 a 3 líneas).
                - No seas seco ni robotizado, pero evita textos largos innecesarios.
                - NUNCA menciones IDs numéricos internos, consultas SQL, nombres de tablas ni términos técnicos de programación.

                REGLAS DE ACCIÓN Y NAVEGACIÓN:
                1. Si el usuario pregunta por **tareas pendientes, entregas por revisar o sus aulas/actividades**:
                   - Llama SIEMPRE a `consultar_mis_aulas_y_pendientes`.
                   - El sistema devolverá las aulas con su número exacto de pendientes y mostrará tarjetas/pastillas clicables debajo de tu respuesta.
                   - Si `totalPendientes` es 0 y tiene aulas (`totalAulas > 0`), responde con tono alegre y cercano (nada seco), por ejemplo: "¡No tienes tareas pendientes, estás totalmente al día! Aquí te muestro tus aulas por si quieres darles un vistazo:".
                   - Si `totalPendientes > 0` y tiene varias aulas (>1), dile amablemente cuántas pendientes tiene y pídele que elija cuál desea abrir de las opciones mostradas.
                   - Si solo tiene 1 aula y pidió explícitamente "llévame / ir a", llama también a `navegar_a` con la ruta de esa aula.
                   - Si `totalAulas` es 0, dile amablemente que aún no tiene aulas asignadas o inscripciones activas y pregúntale si desea ir a ver convocatorias.
                2. Si el usuario pide ir a un módulo específico:
                   - Reportes IA -> `navegar_a("/dashboard/reportes")`
                   - Convocatorias / Ferias -> `navegar_a("/dashboard/convocatorias")`
                   - Mis Áreas / Aulas -> `navegar_a("/dashboard/mis-areas")`
                   - Plantillas -> `navegar_a("/dashboard/plantillas")`
                   - Usuarios -> `navegar_a("/dashboard/usuarios")`
                   - Biblioteca -> `navegar_a("/dashboard/biblioteca")`
                   - Perfil -> `navegar_a("/dashboard/perfil")`
                   - Panel de Jurado -> `navegar_a("/dashboard/jurado")`
                   - Mis Pendientes (solo Estudiante) -> `navegar_a("/dashboard/mis-pendientes")`
                3. Si el usuario quiere **crear una convocatoria, feria, hackathon, concurso o investigación**:
                   - Llama a `abrir_agente_convocatorias` pasando lo que el usuario pidió en `promptInicial`.
                4. Si el usuario solo saluda o pregunta qué puedes hacer, responde amablemente sin llamar herramientas.
                """.formatted(
                user.getNombre(),
                user.getApellido() != null ? user.getApellido() : "",
                user.getRol().name(),
                rutaActual != null ? rutaActual : "/dashboard"
        );
    }

    private List<Map<String, Object>> construirTools() {
        return List.of(
                Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", "consultar_mis_aulas_y_pendientes",
                                "description", "Obtiene las aulas/convocatorias del usuario autenticado con la cantidad exacta de tareas pendientes o entregas por calificar según su rol.",
                                "parameters", Map.of("type", "object", "required", List.of(), "properties", Map.of())
                        )
                ),
                Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", "navegar_a",
                                "description", "Navega inmediatamente a una ruta del dashboard autorizada para el rol del usuario.",
                                "parameters", Map.of(
                                        "type", "object",
                                        "required", List.of("ruta"),
                                        "properties", Map.of(
                                                "ruta", Map.of("type", "string", "description", "Ruta destino comenzando por /dashboard")
                                        )
                                )
                        )
                ),
                Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", "abrir_agente_convocatorias",
                                "description", "Transfiere al usuario al Agente IA especializado en crear y estructurar convocatorias (solo Admin o Docente).",
                                "parameters", Map.of(
                                        "type", "object",
                                        "required", List.of(),
                                        "properties", Map.of(
                                                "promptInicial", Map.of("type", "string", "description", "Descripción o instrucción inicial si el usuario dio detalles")
                                        )
                                )
                        )
                )
        );
    }

    private HttpHeaders crearHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey.trim());
        headers.set("User-Agent", "FICCT-Backend/1.0");
        return headers;
    }

    private String descubrirModeloDisponible() {
        try {
            ResponseEntity<String> res = restTemplate.exchange(
                    GROQ_MODELS_URL, HttpMethod.GET, new HttpEntity<>(crearHeaders()), String.class);
            if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) return null;
            JsonNode data = objectMapper.readTree(res.getBody()).path("data");
            List<String> disponibles = new ArrayList<>();
            for (JsonNode m : data) {
                String id = m.path("id").asText("");
                String lower = id.toLowerCase(Locale.ROOT);
                if (!id.isBlank() && !lower.contains("whisper") && !lower.contains("guard") && !lower.contains("tts")) {
                    disponibles.add(id);
                }
            }
            for (String p : List.of("llama-3.1-8b-instant", "llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3-32b")) {
                if (disponibles.contains(p)) return p;
            }
            return disponibles.isEmpty() ? null : disponibles.get(0);
        } catch (Exception e) {
            return null;
        }
    }
}
