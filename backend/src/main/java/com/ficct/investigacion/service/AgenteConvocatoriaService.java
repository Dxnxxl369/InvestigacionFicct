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

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AgenteConvocatoriaService {

    private static final Logger log = LoggerFactory.getLogger(AgenteConvocatoriaService.class);

    private static final Map<String, Integer> MESES_ES = Map.ofEntries(
            Map.entry("enero", 1), Map.entry("ene", 1),
            Map.entry("febrero", 2), Map.entry("feb", 2),
            Map.entry("marzo", 3), Map.entry("mar", 3),
            Map.entry("abril", 4), Map.entry("abr", 4),
            Map.entry("mayo", 5), Map.entry("may", 5),
            Map.entry("junio", 6), Map.entry("jun", 6),
            Map.entry("julio", 7), Map.entry("jul", 7),
            Map.entry("agosto", 8), Map.entry("ago", 8),
            Map.entry("septiembre", 9), Map.entry("setiembre", 9), Map.entry("sep", 9),
            Map.entry("octubre", 10), Map.entry("oct", 10),
            Map.entry("noviembre", 11), Map.entry("nov", 11),
            Map.entry("diciembre", 12), Map.entry("dic", 12)
    );

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

        ConvocatoriaBorradorDTO actual = request.getEstadoActual() != null
                ? request.getEstadoActual()
                : new ConvocatoriaBorradorDTO();

        LocalDate hoy = LocalDate.now();
        String reqActuales = (actual.getRequisitos() != null && !actual.getRequisitos().isEmpty())
                ? actual.getRequisitos().toString()
                : "ninguno (vacío)";

        String systemPrompt = """
                Eres el Asistente Inteligente de la FICCT (UAGRM) para crear o completar convocatorias académicas (Hackathon, Feria, Concurso o Investigación).
                Fecha actual del sistema: """ + hoy + """
                
                REGLAS ESTRICTAS DE NEGOCIO:
                1. Tipos válidos: HACKATHON, FERIA, CONCURSO, INVESTIGACION.
                2. Modalidad: GRUPAL o INDIVIDUAL. Si el usuario menciona equipos, grupos o integrantes, es GRUPAL.
                3. Cupos de equipo por defecto para GRUPAL: min 2, max 5 (o los que indique el usuario).
                4. FECHAS (MUY IMPORTANTE):
                   - Formato obligatorio: "YYYY-MM-DD" o "" si aún no se ha indicado fecha.
                   - Si el usuario indica una fecha (ej. "20 de noviembre", "para el 20/11", "cierra el 5 de diciembre"), debes calcular y poner EXACTAMENTE ese día y mes en "fechaFinInscripcion" (ej. "20 de noviembre" -> \"""" + hoy.getYear() + """
                -11-20\"), sobrescribiendo cualquier fecha previa.
                   - Si el usuario NO ha dicho ninguna fecha y el estado actual no tiene fecha, deja "fechaFinInscripcion": "" y pregúntale cuál será la fecha límite de inscripción.
                5. REQUISITOS (MUY IMPORTANTE):
                   - NUNCA inventes ni agregues requisitos de más por tu cuenta si el usuario NO pidió requisitos.
                   - Si el usuario no mencionó requisitos en su mensaje y el estado actual tiene requisitos vacíos [], DEJA "requisitos": [] y en tu "mensaje" pregúntale explícitamente: "¿Quisieras agregar algunos requisitos para la inscripción?".
                   - Solo agrega, modifica o quita requisitos cuando el usuario los mencione explícitamente (o pida expresamente que le sugieras requisitos).
                   - Conserva los requisitos previos del estado actual salvo que el usuario pida cambiarlos o eliminarlos.
                6. DOCENTES:
                   - NUNCA autoasignes docentes en "selectedDocenteIds" a menos que el usuario mencione explícitamente el nombre o apellido de un docente del catálogo.
                   - Si no hay docentes asignados aún, pregunta qué docente del catálogo desea asignar como encargado.
                7. DETECCIÓN DE CAMPOS FALTANTES:
                   - Revisa el ESTADO ACTUAL del JSON resultante y verifica qué campos siguen vacíos o sin definir: título, descripción, fechaFinInscripcion, requisitos, selectedDocenteIds.
                   - En el campo "mensaje" (máximo 2 a 3 líneas claras), confirma brevemente lo que actualizaste y pregunta puntualmente por los datos que faltan para completar la convocatoria.
                
                DOCENTES DISPONIBLES EN LA FACULTAD:
                """ + (docCatalogo.length() > 0 ? docCatalogo.toString() : "NINGUNO. Informa al usuario que no hay docentes activos registrados.") + """
                
                ESTADO ACTUAL DEL FORMULARIO:
                - Tipo: """ + (actual.getTipo() != null && !actual.getTipo().isBlank() ? actual.getTipo() : "sin definir") + """
                - Modalidad: """ + (actual.getModalidadInscripcion() != null && !actual.getModalidadInscripcion().isBlank() ? actual.getModalidadInscripcion() : "sin definir") + """
                - Título: """ + (actual.getTitulo() != null && !actual.getTitulo().isBlank() ? actual.getTitulo() : "sin definir") + """
                - Descripción: """ + (actual.getDescripcion() != null && !actual.getDescripcion().isBlank() ? actual.getDescripcion() : "sin definir") + """
                - Fecha Cierre: """ + (actual.getFechaFinInscripcion() != null && !actual.getFechaFinInscripcion().isBlank() ? actual.getFechaFinInscripcion() : "sin definir") + """
                - Min Miembros: """ + (actual.getCuposMinEquipo() != null ? actual.getCuposMinEquipo() : 2) + """
                - Max Miembros: """ + (actual.getCuposMaxEquipo() != null ? actual.getCuposMaxEquipo() : 5) + """
                - Requisitos actuales: """ + reqActuales + """
                - Docentes Asignados IDs: """ + (actual.getSelectedDocenteIds() != null && !actual.getSelectedDocenteIds().isEmpty() ? actual.getSelectedDocenteIds().toString() : "ninguno") + """
                
                INSTRUCCIÓN DE RESPUESTA:
                Responde ÚNICAMENTE con un objeto JSON válido (sin markdown ```json, sin texto antes ni después).
                Esquema obligatorio:
                {
                  "tipo": "HACKATHON" | "FERIA" | "CONCURSO" | "INVESTIGACION",
                  "modalidadInscripcion": "GRUPAL" | "INDIVIDUAL",
                  "titulo": "Título formal",
                  "descripcion": "Descripción clara del objetivo y alcance",
                  "fechaFinInscripcion": "YYYY-MM-DD o vacío",
                  "cuposMinEquipo": 2,
                  "cuposMaxEquipo": 5,
                  "requisitos": [],
                  "selectedDocenteIds": [],
                  "mensaje": "Confirmación breve + pregunta concreta sobre los campos que faltan (ej. requisitos, fecha o docente)."
                }
                """;

        ConvocatoriaBorradorDTO actualizado;
        String mensajeAgente;

        try {
            actualizado = llamarGroq(systemPrompt, request.getMensaje(), request.getHistorial(), actual);
            mensajeAgente = actualizado.getDocenteSugeridoNombre() != null
                    ? actualizado.getDocenteSugeridoNombre()
                    : "He actualizado los campos de la convocatoria según tus indicaciones.";
        } catch (Exception e) {
            log.error("Error al procesar solicitud con Groq: {}", e.getMessage(), e);
            actualizado = aplicarFallbackHeuristico(request.getMensaje(), actual, docentesActivos);
            mensajeAgente = actualizado.getDocenteSugeridoNombre() != null
                    ? actualizado.getDocenteSugeridoNombre()
                    : "He actualizado el borrador de la convocatoria.";
        }

        // Calcular campos faltantes reales y progreso
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

    private ConvocatoriaBorradorDTO llamarGroq(String systemPrompt, String mensajeUsuario,
                                               List<ChatMessage> historial, ConvocatoriaBorradorDTO actual) {
        String url = "https://api.groq.com/openai/v1/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", groqModel);
        body.put("max_tokens", 900);
        body.put("temperature", 0.1);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        if (historial != null && !historial.isEmpty()) {
            int start = Math.max(0, historial.size() - 6);
            for (int i = start; i < historial.size(); i++) {
                ChatMessage hm = historial.get(i);
                if (hm.getTexto() == null || hm.getTexto().isBlank()) continue;
                String role = "AGENTE".equalsIgnoreCase(hm.getRemitente()) ? "assistant" : "user";
                messages.add(Map.of("role", role, "content", hm.getTexto()));
            }
        }
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
        throw new IllegalStateException("Respuesta vacía o inválida de Groq");
    }

    private ConvocatoriaBorradorDTO parsearRespuestaJson(String raw, ConvocatoriaBorradorDTO base) {
        try {
            // Eliminar bloques de pensamiento (<think>...</think>) o markdown antes de extraer JSON
            String cleaned = raw.replaceAll("(?s)<think>.*?</think>", "").trim();
            int firstBrace = cleaned.indexOf('{');
            int lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }

            JsonNode node = objectMapper.readTree(cleaned);
            ConvocatoriaBorradorDTO dto = new ConvocatoriaBorradorDTO();

            dto.setTipo(node.hasNonNull("tipo") ? node.get("tipo").asText().toUpperCase() : base.getTipo());
            dto.setModalidadInscripcion(node.hasNonNull("modalidadInscripcion")
                    ? node.get("modalidadInscripcion").asText().toUpperCase()
                    : base.getModalidadInscripcion());
            dto.setTitulo(node.hasNonNull("titulo") ? node.get("titulo").asText() : base.getTitulo());
            dto.setDescripcion(node.hasNonNull("descripcion") ? node.get("descripcion").asText() : base.getDescripcion());
            dto.setFechaFinInscripcion(node.hasNonNull("fechaFinInscripcion")
                    ? node.get("fechaFinInscripcion").asText().trim()
                    : base.getFechaFinInscripcion());
            dto.setCuposMinEquipo(node.hasNonNull("cuposMinEquipo")
                    ? node.get("cuposMinEquipo").asInt()
                    : (base.getCuposMinEquipo() != null ? base.getCuposMinEquipo() : 2));
            dto.setCuposMaxEquipo(node.hasNonNull("cuposMaxEquipo")
                    ? node.get("cuposMaxEquipo").asInt()
                    : (base.getCuposMaxEquipo() != null ? base.getCuposMaxEquipo() : 5));

            if (node.hasNonNull("requisitos") && node.get("requisitos").isArray()) {
                List<String> reqs = new ArrayList<>();
                node.get("requisitos").forEach(r -> {
                    String val = r.asText().trim();
                    if (!val.isEmpty()) reqs.add(val);
                });
                dto.setRequisitos(reqs);
            } else {
                dto.setRequisitos(base.getRequisitos() != null ? base.getRequisitos() : new ArrayList<>());
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
            throw new IllegalStateException("JSON inválido del modelo", e);
        }
    }

    private String extraerFechaEnTexto(String mensaje) {
        String lower = mensaje.toLowerCase(Locale.ROOT);
        int anioActual = LocalDate.now().getYear();

        // Formato ISO YYYY-MM-DD
        Matcher iso = Pattern.compile("(\\d{4})-(\\d{1,2})-(\\d{1,2})").matcher(lower);
        if (iso.find()) {
            return String.format("%04d-%02d-%02d",
                    Integer.parseInt(iso.group(1)),
                    Integer.parseInt(iso.group(2)),
                    Integer.parseInt(iso.group(3)));
        }

        // Formato "20 de noviembre" o "20 nov"
        Matcher textoMes = Pattern.compile("(\\d{1,2})\\s*(?:de\\s+)?([a-záéíóú]+)(?:\\s*(?:de|del)\\s*(\\d{4}))?").matcher(lower);
        while (textoMes.find()) {
            Integer mes = MESES_ES.get(textoMes.group(2));
            if (mes != null) {
                int dia = Integer.parseInt(textoMes.group(1));
                int anio = textoMes.group(3) != null ? Integer.parseInt(textoMes.group(3)) : anioActual;
                if (dia >= 1 && dia <= 31) {
                    return String.format("%04d-%02d-%02d", anio, mes, dia);
                }
            }
        }

        // Formato dd/MM o dd/MM/yyyy
        Matcher slash = Pattern.compile("\\b(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?\\b").matcher(lower);
        if (slash.find()) {
            int dia = Integer.parseInt(slash.group(1));
            int mes = Integer.parseInt(slash.group(2));
            int anio = slash.group(3) != null ? Integer.parseInt(slash.group(3)) : anioActual;
            if (anio < 100) anio += 2000;
            if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
                return String.format("%04d-%02d-%02d", anio, mes, dia);
            }
        }
        return null;
    }

    private ConvocatoriaBorradorDTO aplicarFallbackHeuristico(String mensaje, ConvocatoriaBorradorDTO base, List<User> docentes) {
        String m = mensaje.toLowerCase(Locale.ROOT);
        ConvocatoriaBorradorDTO d = new ConvocatoriaBorradorDTO();

        if (m.contains("hackathon") || m.contains("hackaton")) d.setTipo("HACKATHON");
        else if (m.contains("feria")) d.setTipo("FERIA");
        else if (m.contains("concurso")) d.setTipo("CONCURSO");
        else if (m.contains("investigacion") || m.contains("investigación")) d.setTipo("INVESTIGACION");
        else d.setTipo(base.getTipo() != null ? base.getTipo() : "HACKATHON");

        if (m.contains("individual")) {
            d.setModalidadInscripcion("INDIVIDUAL");
        } else {
            d.setModalidadInscripcion("GRUPAL");
            d.setCuposMinEquipo(base.getCuposMinEquipo() != null ? base.getCuposMinEquipo() : 2);
            d.setCuposMaxEquipo(m.contains("5") ? 5 : (m.contains("4") ? 4 : (m.contains("3") ? 3 : (base.getCuposMaxEquipo() != null ? base.getCuposMaxEquipo() : 5))));
        }

        d.setTitulo(base.getTitulo() != null && !base.getTitulo().isBlank()
                ? base.getTitulo()
                : (d.getTipo().equals("HACKATHON") ? "Hackathon FICCT Innovación y Software " + LocalDate.now().getYear() : "Convocatoria Académica " + LocalDate.now().getYear()));

        d.setDescripcion(base.getDescripcion() != null && !base.getDescripcion().isBlank()
                ? base.getDescripcion()
                : "Convocatoria orientada a estudiantes de la FICCT para el desarrollo de proyectos y competencias técnicas.");

        String fechaDetectada = extraerFechaEnTexto(mensaje);
        if (fechaDetectada != null) {
            d.setFechaFinInscripcion(fechaDetectada);
        } else {
            d.setFechaFinInscripcion(base.getFechaFinInscripcion() != null ? base.getFechaFinInscripcion() : "");
        }

        // No inventar requisitos si el usuario no los pidió
        List<String> reqs = base.getRequisitos() != null ? new ArrayList<>(base.getRequisitos()) : new ArrayList<>();
        if (m.contains("requisito")) {
            // Si el usuario escribió requisitos explícitamente, agregar la línea como requisito si no pidió sugerencias
            if (m.contains("sugier") || m.contains("defecto") || m.contains("pon unos")) {
                reqs = List.of(
                        "Ser estudiante activo y regular de la FICCT - UAGRM",
                        "Contar con equipo conformado según los cupos establecidos"
                );
            } else {
                reqs.add(mensaje.trim());
            }
        }
        d.setRequisitos(reqs);

        List<Long> docenteIds = new ArrayList<>();
        for (User u : docentes) {
            if (m.contains(u.getNombre().toLowerCase(Locale.ROOT)) || m.contains(u.getApellido().toLowerCase(Locale.ROOT))) {
                docenteIds.add(u.getId());
                break;
            }
        }
        if (docenteIds.isEmpty() && base.getSelectedDocenteIds() != null) {
            docenteIds.addAll(base.getSelectedDocenteIds());
        }
        d.setSelectedDocenteIds(docenteIds);

        List<String> preguntas = new ArrayList<>();
        if (d.getFechaFinInscripcion() == null || d.getFechaFinInscripcion().isBlank()) {
            preguntas.add("¿cuál será la fecha límite de inscripción?");
        }
        if (d.getRequisitos() == null || d.getRequisitos().isEmpty()) {
            preguntas.add("¿quisieras agregar algunos requisitos para la inscripción?");
        }
        if (d.getSelectedDocenteIds() == null || d.getSelectedDocenteIds().isEmpty()) {
            preguntas.add("¿qué docente encargado deseas asignar?");
        }

        String msg = preguntas.isEmpty()
                ? "He actualizado el borrador completo con tus indicaciones."
                : "He actualizado los datos indicados. Para completar el borrador, " + String.join(" Y ", preguntas);
        d.setDocenteSugeridoNombre(msg);

        return d;
    }
}
