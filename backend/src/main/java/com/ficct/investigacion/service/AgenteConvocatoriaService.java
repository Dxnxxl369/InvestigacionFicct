package com.ficct.investigacion.service;

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
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AgenteConvocatoriaService {

    private static final Logger log = LoggerFactory.getLogger(AgenteConvocatoriaService.class);

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.groq.model:qwen/qwen3.8-27b}")
    private String groqModel;

    public AgenteConvocatoriaService(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public ChatResponse procesarMensajeAgente(ChatRequest request) {
        // 1. Obtener lista segura de docentes activos desde BD (sin exponer contraseñas ni roles ajenos)
        List<User> docentesActivos = userRepository.findAll().stream()
                .filter(u -> u.getRol() == Rol.DOCENTE && u.getEstado() == EstadoUsuario.ACTIVO)
                .toList();

        List<DocenteOpcionDTO> opcionesDocentes = docentesActivos.stream()
                .map(d -> new DocenteOpcionDTO(d.getId(), d.getNombreCompleto(), d.getEmail()))
                .collect(Collectors.toList());

        StringBuilder docCatalogo = new StringBuilder();
        for (User d : docentesActivos) {
            docCatalogo.append("- ID ").append(d.getId()).append(": ").append(d.getNombreCompleto())
                    .append(" (").append(d.getEmail()).append(")\n");
        }

        // 2. Construir el prompt de sistema con reglas de negocio del software
        ConvocatoriaBorradorDTO actual = request.getEstadoActual() != null
                ? request.getEstadoActual()
                : new ConvocatoriaBorradorDTO();

        String systemPrompt = """
                Eres el Asistente Inteligente de la FICCT (Facultad Integral del Chaco y Computación / Tecnología) de la UAGRM.
                Tu propósito es ayudar a crear o completar una convocatoria académica (Hackathon, Feria, Concurso o Investigación).
                
                REGLAS ESTRICTAS DE NEGOCIO:
                - Tipo válidos: HACKATHON, FERIA, CONCURSO, INVESTIGACION.
                - Modalidad: GRUPAL o INDIVIDUAL. Si el usuario menciona equipos o personas por grupo, es GRUPAL.
                - Cupos de equipo por defecto para GRUPAL: min 2, max 5 (o lo que pida el usuario).
                - Fecha de cierre en formato ISO: YYYY-MM-DD. Debe ser coherente con el año en curso (2026).
                - Si no hay docentes registrados en la facultad, avisa claramente que no hay docentes disponibles para asignar.
                - Si hay docentes en el catálogo, NUNCA los autoasignes a menos que el usuario mencione explícitamente su nombre o apellido. Deja "selectedDocenteIds": [] y sugiere los nombres en el mensaje para que el usuario elija.
                - Si el usuario dice "Asignar como docente a X" o menciona el nombre de un docente del catálogo, pon su ID en selectedDocenteIds.
                - Requisitos: genera siempre entre 2 y 4 requisitos concretos acordes al evento.
                
                DOCENTES DISPONIBLES EN LA FACULTAD:
                """ + (docCatalogo.length() > 0 ? docCatalogo.toString() : "NINGUNO. Informa al usuario que debe registrar o invitar docentes primero.") + """
                
                ESTADO ACTUAL DEL FORMULARIO:
                - Tipo: """ + (actual.getTipo() != null ? actual.getTipo() : "sin definir") + """
                - Modalidad: """ + (actual.getModalidadInscripcion() != null ? actual.getModalidadInscripcion() : "sin definir") + """
                - Título: """ + (actual.getTitulo() != null ? actual.getTitulo() : "sin definir") + """
                - Descripción: """ + (actual.getDescripcion() != null ? actual.getDescripcion() : "sin definir") + """
                - Fecha Cierre: """ + (actual.getFechaFinInscripcion() != null ? actual.getFechaFinInscripcion() : "sin definir") + """
                - Min Miembros: """ + (actual.getCuposMinEquipo() != null ? actual.getCuposMinEquipo() : 2) + """
                - Max Miembros: """ + (actual.getCuposMaxEquipo() != null ? actual.getCuposMaxEquipo() : 4) + """
                - Docentes Asignados IDs: """ + (actual.getSelectedDocenteIds() != null ? actual.getSelectedDocenteIds().toString() : "ninguno") + """
                
                INSTRUCCIÓN DE RESPUESTA:
                Debes responder ÚNICAMENTE con un objeto JSON válido (sin bloques ```json, sin introducciones).
                El esquema obligatorio del JSON es:
                {
                  "tipo": "HACKATHON" | "FERIA" | "CONCURSO" | "INVESTIGACION",
                  "modalidadInscripcion": "GRUPAL" | "INDIVIDUAL",
                  "titulo": "Título atractivo y formal",
                  "descripcion": "Descripción detallada del objetivo y alcance",
                  "fechaFinInscripcion": "YYYY-MM-DD",
                  "cuposMinEquipo": 2,
                  "cuposMaxEquipo": 5,
                  "requisitos": ["requisito 1", "requisito 2"],
                  "selectedDocenteIds": [],
                  "mensaje": "Mensaje MUY BREVE (máximo 2 a 3 líneas): confirma lo que configuraste y pregunta solo el dato que falte (docente o requisitos)."
                }
                """;

        // 3. Invocar la API de Groq
        ConvocatoriaBorradorDTO actualizado = new ConvocatoriaBorradorDTO();
        String mensajeAgente = "He recibido tu solicitud y configurado el borrador inicial.";

        try {
            actualizado = llamarGroq(systemPrompt, request.getMensaje(), actual);
            mensajeAgente = actualizado.getDocenteSugeridoNombre() != null
                    ? actualizado.getDocenteSugeridoNombre()
                    : "He actualizado los campos de la convocatoria según tus indicaciones.";
        } catch (Exception e) {
            log.error("Error al procesar solicitud con Groq: {}", e.getMessage(), e);
            // Fallback determinístico en caso de timeout o indisponibilidad
            actualizado = aplicarFallbackHeuristico(request.getMensaje(), actual, docentesActivos);
            mensajeAgente = "He procesado tu solicitud localmente y actualizado el borrador de la convocatoria.";
        }

        // 4. Calcular campos faltantes y porcentaje de avance
        List<String> faltantes = new ArrayList<>();
        int puntos = 0;

        if (actualizado.getTitulo() != null && !actualizado.getTitulo().isBlank()) puntos += 20;
        else faltantes.add("Título de la convocatoria");

        if (actualizado.getDescripcion() != null && !actualizado.getDescripcion().isBlank()) puntos += 20;
        else faltantes.add("Descripción de objetivos");

        if (actualizado.getTipo() != null) puntos += 15;
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

    private ConvocatoriaBorradorDTO llamarGroq(String systemPrompt, String mensajeUsuario, ConvocatoriaBorradorDTO actual) {
        String url = "https://api.groq.com/openai/v1/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", groqModel);
        body.put("max_tokens", 800);
        body.put("temperature", 0.1);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", mensajeUsuario));
        body.put("messages", messages);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> res = restTemplate.postForEntity(url, entity, String.class);

        if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
            try {
                JsonNode root = objectMapper.readTree(res.getBody());
                String rawContent = root.path("choices").get(0).path("message").path("content").asText();
                return parsearRespuestaJson(rawContent, actual);
            } catch (Exception e) {
                log.warn("No se pudo parsear el JSON retornado por Groq: {}", e.getMessage());
            }
        }
        return actual;
    }

    private ConvocatoriaBorradorDTO parsearRespuestaJson(String raw, ConvocatoriaBorradorDTO base) {
        try {
            String cleaned = raw.trim();
            if (cleaned.startsWith("```json")) {
                cleaned = cleaned.substring(7);
            }
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.substring(3);
            }
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.length() - 3);
            }
            cleaned = cleaned.trim();

            JsonNode node = objectMapper.readTree(cleaned);
            ConvocatoriaBorradorDTO dto = new ConvocatoriaBorradorDTO();

            dto.setTipo(node.hasNonNull("tipo") ? node.get("tipo").asText().toUpperCase() : base.getTipo());
            dto.setModalidadInscripcion(node.hasNonNull("modalidadInscripcion")
                    ? node.get("modalidadInscripcion").asText().toUpperCase()
                    : base.getModalidadInscripcion());
            dto.setTitulo(node.hasNonNull("titulo") ? node.get("titulo").asText() : base.getTitulo());
            dto.setDescripcion(node.hasNonNull("descripcion") ? node.get("descripcion").asText() : base.getDescripcion());
            dto.setFechaFinInscripcion(node.hasNonNull("fechaFinInscripcion")
                    ? node.get("fechaFinInscripcion").asText()
                    : base.getFechaFinInscripcion());
            dto.setCuposMinEquipo(node.hasNonNull("cuposMinEquipo")
                    ? node.get("cuposMinEquipo").asInt()
                    : (base.getCuposMinEquipo() != null ? base.getCuposMinEquipo() : 2));
            dto.setCuposMaxEquipo(node.hasNonNull("cuposMaxEquipo")
                    ? node.get("cuposMaxEquipo").asInt()
                    : (base.getCuposMaxEquipo() != null ? base.getCuposMaxEquipo() : 5));

            if (node.hasNonNull("requisitos") && node.get("requisitos").isArray()) {
                List<String> reqs = new ArrayList<>();
                node.get("requisitos").forEach(r -> reqs.add(r.asText()));
                dto.setRequisitos(reqs);
            } else {
                dto.setRequisitos(base.getRequisitos());
            }

            if (node.hasNonNull("selectedDocenteIds") && node.get("selectedDocenteIds").isArray()) {
                List<Long> ids = new ArrayList<>();
                node.get("selectedDocenteIds").forEach(idNode -> ids.add(idNode.asLong()));
                dto.setSelectedDocenteIds(ids);
            } else {
                dto.setSelectedDocenteIds(base.getSelectedDocenteIds());
            }

            if (node.hasNonNull("mensaje")) {
                dto.setDocenteSugeridoNombre(node.get("mensaje").asText());
            }

            return dto;
        } catch (Exception e) {
            log.error("Fallo al decodificar JSON del modelo: {}", e.getMessage());
            return base;
        }
    }

    private ConvocatoriaBorradorDTO aplicarFallbackHeuristico(String mensaje, ConvocatoriaBorradorDTO base, List<User> docentes) {
        String m = mensaje.toLowerCase();
        ConvocatoriaBorradorDTO d = new ConvocatoriaBorradorDTO();

        // Tipo
        if (m.contains("hackathon") || m.contains("hackaton")) d.setTipo("HACKATHON");
        else if (m.contains("feria")) d.setTipo("FERIA");
        else if (m.contains("concurso")) d.setTipo("CONCURSO");
        else if (m.contains("investigacion") || m.contains("investigación")) d.setTipo("INVESTIGACION");
        else d.setTipo(base.getTipo() != null ? base.getTipo() : "HACKATHON");

        // Modalidad y Cupos
        if (m.contains("individual")) {
            d.setModalidadInscripcion("INDIVIDUAL");
        } else {
            d.setModalidadInscripcion("GRUPAL");
            d.setCuposMinEquipo(2);
            d.setCuposMaxEquipo(m.contains("5") ? 5 : (m.contains("4") ? 4 : (m.contains("3") ? 3 : 5)));
        }

        d.setTitulo(base.getTitulo() != null && !base.getTitulo().isBlank()
                ? base.getTitulo()
                : (d.getTipo().equals("HACKATHON") ? "Hackathon FICCT Innovación y Software 2026" : "Convocatoria Académica 2026"));

        d.setDescripcion(base.getDescripcion() != null && !base.getDescripcion().isBlank()
                ? base.getDescripcion()
                : "Convocatoria orientada a estudiantes de la FICCT para el desarrollo de proyectos y competencias técnicas.");

        if (m.contains("15 de noviembre") || m.contains("15 nov")) {
            d.setFechaFinInscripcion("2026-11-15");
        } else {
            d.setFechaFinInscripcion(base.getFechaFinInscripcion() != null ? base.getFechaFinInscripcion() : "2026-11-30");
        }

        d.setRequisitos(List.of(
                "Ser estudiante activo y regular de la FICCT - UAGRM",
                "Contar con equipo conformado según los cupos establecidos",
                "Presentar aval del docente o avance del proyecto"
        ));

        // Docente coincidente
        List<Long> docenteIds = new ArrayList<>();
        for (User u : docentes) {
            String nom = u.getNombreCompleto().toLowerCase();
            if (m.contains(u.getNombre().toLowerCase()) || m.contains(u.getApellido().toLowerCase())) {
                docenteIds.add(u.getId());
                break;
            }
        }
        if (docenteIds.isEmpty() && base.getSelectedDocenteIds() != null) {
            docenteIds.addAll(base.getSelectedDocenteIds());
        }
        d.setSelectedDocenteIds(docenteIds);
        d.setDocenteSugeridoNombre("He configurado el borrador con los datos provistos. Revisa las fechas y docentes asignados.");

        return d;
    }
}
