package com.ficct.investigacion.ai.convocatoria.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.AgenteConvocatoriaDTO.ConvocatoriaBorradorDTO;
import com.ficct.investigacion.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class ConvocatoriaToolExecutor {

    private static final Logger log = LoggerFactory.getLogger(ConvocatoriaToolExecutor.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String ejecutarHerramienta(String fnName, String argsRaw,
                                      ConvocatoriaBorradorDTO borrador, List<User> docentesActivos) {
        try {
            JsonNode args = objectMapper.readTree(argsRaw != null && !argsRaw.isBlank() ? argsRaw : "{}");
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
                        String tit = args.get("titulo").asText().trim();
                        if (!tit.isEmpty()) borrador.setTitulo(tit);
                    }
                    if (args.hasNonNull("descripcion")) {
                        String desc = args.get("descripcion").asText().trim();
                        if (!desc.isEmpty()) borrador.setDescripcion(desc);
                    }
                    if (args.has("fechaFinInscripcion") && !args.get("fechaFinInscripcion").isNull()) {
                        String fecha = args.get("fechaFinInscripcion").asText().trim();
                        if (!fecha.isEmpty()) borrador.setFechaFinInscripcion(fecha);
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
                default -> {
                    log.warn("[ConvocatoriaToolExecutor] Herramienta desconocida: {}", fnName);
                    return "{\"ok\":false,\"error\":\"Herramienta desconocida\"}";
                }
            }
            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "estadoActualizado", borrador
            ));
        } catch (Exception e) {
            log.warn("[ConvocatoriaToolExecutor] Error ejecutando tool {}: {}", fnName, e.getMessage());
            String safeErr = e.getMessage() != null ? e.getMessage().replace("\"", "'") : "Error interno";
            return "{\"ok\":false,\"error\":\"" + safeErr + "\"}";
        }
    }
}
