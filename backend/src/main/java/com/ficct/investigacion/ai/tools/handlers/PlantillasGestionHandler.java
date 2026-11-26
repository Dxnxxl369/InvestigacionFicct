package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.CopilotoDTO.ConfirmacionPendiente;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.CopilotoDTO.ItemConfirmacion;
import com.ficct.investigacion.model.Convocatoria;
import com.ficct.investigacion.model.EstadoConvocatoria;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.TipoConvocatoria;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.ConvocatoriaRepository;
import com.ficct.investigacion.service.PlantillaService;
import com.ficct.investigacion.service.PlantillaService.ActividadDatos;
import com.ficct.investigacion.service.PlantillaService.PlantillaDatos;
import com.ficct.investigacion.service.PlantillaService.TipoDatos;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.*;

@Component
public class PlantillasGestionHandler {

    private final PlantillaService plantillaService;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PlantillasGestionHandler(PlantillaService plantillaService,
                                    ConvocatoriaRepository convocatoriaRepository) {
        this.plantillaService = plantillaService;
        this.convocatoriaRepository = convocatoriaRepository;
    }

    public String consultar(JsonNode args) throws Exception {
        String filtroNombre = normalizar(args.path("plantillaNombre").asText(""));
        List<PlantillaDatos> plantillas = plantillaService.listar();
        List<TipoDatos> tiposConfig = plantillaService.configuracionTipos();

        Map<Long, List<String>> tiposPorPlantilla = new HashMap<>();
        for (TipoDatos td : tiposConfig) {
            if (td.plantillaIds() == null) continue;
            for (Long pid : td.plantillaIds()) {
                tiposPorPlantilla.computeIfAbsent(pid, k -> new ArrayList<>()).add(td.tipo().name());
            }
        }

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (PlantillaDatos p : plantillas) {
            if (!filtroNombre.isBlank() && !normalizar(p.titulo()).contains(filtroNombre)) {
                continue;
            }
            List<String> tareas = new ArrayList<>();
            if (p.actividades() != null) {
                for (ActividadDatos a : p.actividades()) {
                    String estado = Boolean.TRUE.equals(a.habilitada()) ? "habilitada" : "deshabilitada";
                    tareas.add(a.titulo() + " (" + estado + ")");
                }
            }
            resultado.add(Map.of(
                    "id", p.id(),
                    "titulo", p.titulo(),
                    "totalTareas", tareas.size(),
                    "tareas", tareas,
                    "tiposHabilitados", tiposPorPlantilla.getOrDefault(p.id(), List.of())
            ));
        }

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "totalPlantillas", plantillas.size(),
                "coincidencias", resultado.size(),
                "plantillas", resultado
        ));
    }

    public String asignarAEventos(JsonNode args, User user, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN) {
            return "{\"ok\":false,\"error\":\"Solo Administradores pueden asignar o habilitar plantillas.\"}";
        }

        String plantillaQuery = normalizar(args.path("plantillaNombre").asText(""));
        if (plantillaQuery.isBlank()) {
            return "{\"ok\":false,\"error\":\"Indica el nombre de la plantilla.\"}";
        }

        PlantillaDatos plantilla = plantillaService.listar().stream()
                .filter(p -> normalizar(p.titulo()).contains(plantillaQuery))
                .findFirst()
                .orElse(null);
        if (plantilla == null) {
            return "{\"ok\":false,\"error\":\"No encontré ninguna plantilla llamada '" + args.path("plantillaNombre").asText("") + "'.\"}";
        }

        String accion = args.path("accion").asText("HABILITAR").toUpperCase(Locale.ROOT);
        boolean habilitar = !"DESHABILITAR".equals(accion);
        String eventoNombre = normalizar(args.path("eventoNombre").asText(""));

        Set<TipoConvocatoria> tipos = new LinkedHashSet<>();
        JsonNode tiposNode = args.path("tipos");
        if (tiposNode.isArray()) {
            for (JsonNode tn : tiposNode) {
                parseTipo(tn.asText("")).ifPresent(tipos::add);
            }
        } else if (tiposNode.isTextual()) {
            for (String part : tiposNode.asText("").split("[,;\\s]+")) {
                parseTipo(part).ifPresent(tipos::add);
            }
        }

        // Blindaje: nunca confundir eventoNombre con el nombre de la plantilla o palabras genéricas ("todas las ferias")
        if (!eventoNombre.isBlank() && esEventoNombreGenericoOPlantilla(eventoNombre, plantillaQuery)) {
            for (String token : eventoNombre.split("[\\s,;]+")) {
                parseTipo(token).ifPresent(tipos::add);
            }
            eventoNombre = "";
        }

        if (!eventoNombre.isBlank()) {
            final String eventoFiltro = eventoNombre;
            List<Convocatoria> matches = convocatoriaRepository.findAll().stream()
                    .filter(c -> c.getEstado() != EstadoConvocatoria.FINALIZADA)
                    .filter(c -> tipos.isEmpty() || tipos.contains(c.getTipo()))
                    .filter(c -> normalizar(c.getTitulo()).contains(eventoFiltro))
                    .toList();

            if (matches.isEmpty()) {
                return "{\"ok\":false,\"error\":\"No encontré ferias o convocatorias activas que coincidan con '" + args.path("eventoNombre").asText("") + "'.\"}";
            }

            ConfirmacionPendiente conf = new ConfirmacionPendiente();
            conf.setTipoAccion("ASIGNAR_PLANTILLA_EVENTOS");
            conf.setTargetId(plantilla.id());
            conf.setHabilitada(habilitar);
            conf.setValorTexto(habilitar ? "HABILITAR" : "DESHABILITAR");
            conf.setTitulo("Aplicar plantilla \"" + plantilla.titulo() + "\" en eventos");
            conf.setDetalle("Selecciona en qué convocatorias/ferias quieres activar esta plantilla (" + matches.size() + " coincidencia(s)):");
            List<ItemConfirmacion> items = new ArrayList<>();
            for (Convocatoria c : matches) {
                items.add(new ItemConfirmacion(
                        c.getId(),
                        c.getTitulo(),
                        c.getTipo().name() + " · " + c.getEstado().name(),
                        true
                ));
            }
            conf.setItems(items);

            response.setAccion("CONFIRMAR_ACCION");
            response.setConfirmacionPendiente(conf);

            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "requiereConfirmacion", true,
                    "plantilla", plantilla.titulo(),
                    "coincidencias", matches.stream().map(Convocatoria::getTitulo).toList()
            ));
        }

        if (tipos.isEmpty()) {
            return "{\"ok\":false,\"error\":\"Indica los tipos de convocatoria (FERIA, HACKATHON, CONCURSO, INVESTIGACION) o el nombre del evento.\"}";
        }

        String tiposCsv = String.join(",", tipos.stream().map(Enum::name).toList());
        ConfirmacionPendiente conf = new ConfirmacionPendiente();
        conf.setTipoAccion("ASIGNAR_PLANTILLA_TIPOS");
        conf.setTargetId(plantilla.id());
        conf.setHabilitada(habilitar);
        conf.setValorTexto(tiposCsv);
        conf.setTitulo((habilitar ? "Habilitar" : "Deshabilitar") + " plantilla \"" + plantilla.titulo() + "\"");
        conf.setDetalle("Tipos afectados: " + tiposCsv.replace(",", ", ") + " (se sincroniza con aulas activas)");

        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(conf);

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "requiereConfirmacion", true,
                "plantilla", plantilla.titulo(),
                "tipos", tipos.stream().map(Enum::name).toList(),
                "accion", habilitar ? "HABILITAR" : "DESHABILITAR"
        ));
    }

    public String gestionarEstructura(JsonNode args, User user, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN) {
            return "{\"ok\":false,\"error\":\"Solo Administradores pueden crear, editar o eliminar plantillas.\"}";
        }

        String accion = args.path("accion").asText("").toUpperCase(Locale.ROOT);
        String plantillaNombre = args.path("plantillaNombre").asText("").trim();
        String nuevoTitulo = args.path("nuevoTitulo").asText("").trim();
        String tareaTitulo = args.path("tareaTitulo").asText("").trim();

        ConfirmacionPendiente conf = new ConfirmacionPendiente();
        conf.setTipoAccion("GESTIONAR_PLANTILLA_ESTRUCTURA");

        switch (accion) {
            case "CREAR_PLANTILLA" -> {
                String nombre = !nuevoTitulo.isBlank() ? nuevoTitulo : plantillaNombre;
                if (nombre.isBlank()) return "{\"ok\":false,\"error\":\"Indica el nombre de la nueva plantilla.\"}";
                List<String> tareasList = new ArrayList<>();
                if (args.path("tareas").isArray()) {
                    for (JsonNode t : args.path("tareas")) {
                        if (!t.asText("").isBlank()) tareasList.add(t.asText("").trim());
                    }
                }
                conf.setTargetId(0L);
                conf.setValorTexto("CREAR_PLANTILLA::" + nombre + "::" + String.join("||", tareasList));
                conf.setTitulo("Crear plantilla \"" + nombre + "\"");
                conf.setDetalle(tareasList.isEmpty() ? "Plantilla vacía lista para configurar." : "Tareas iniciales: " + String.join(", ", tareasList));
            }
            case "RENOMBRAR_PLANTILLA", "ELIMINAR_PLANTILLA", "AGREGAR_TAREA", "ELIMINAR_TAREA" -> {
                PlantillaDatos p = plantillaService.listar().stream()
                        .filter(x -> normalizar(x.titulo()).contains(normalizar(plantillaNombre)))
                        .findFirst()
                        .orElse(null);
                if (p == null) return "{\"ok\":false,\"error\":\"No encontré la plantilla '" + plantillaNombre + "'.\"}";
                conf.setTargetId(p.id());
                if ("RENOMBRAR_PLANTILLA".equals(accion)) {
                    if (nuevoTitulo.isBlank()) return "{\"ok\":false,\"error\":\"Indica el nuevo título para la plantilla.\"}";
                    conf.setValorTexto("RENOMBRAR_PLANTILLA::" + nuevoTitulo);
                    conf.setTitulo("Renombrar plantilla \"" + p.titulo() + "\"");
                    conf.setDetalle("Nuevo nombre: \"" + nuevoTitulo + "\"");
                } else if ("ELIMINAR_PLANTILLA".equals(accion)) {
                    conf.setValorTexto("ELIMINAR_PLANTILLA::");
                    conf.setTitulo("Eliminar plantilla \"" + p.titulo() + "\"");
                    conf.setDetalle("Se quitará la plantilla del catálogo global.");
                } else if ("AGREGAR_TAREA".equals(accion)) {
                    if (tareaTitulo.isBlank()) return "{\"ok\":false,\"error\":\"Indica el título de la tarea a agregar.\"}";
                    conf.setValorTexto("AGREGAR_TAREA::" + tareaTitulo);
                    conf.setTitulo("Agregar tarea a \"" + p.titulo() + "\"");
                    conf.setDetalle("Nueva tarea: \"" + tareaTitulo + "\"");
                } else {
                    if (tareaTitulo.isBlank()) return "{\"ok\":false,\"error\":\"Indica el título de la tarea a eliminar.\"}";
                    conf.setValorTexto("ELIMINAR_TAREA::" + tareaTitulo);
                    conf.setTitulo("Eliminar tarea de \"" + p.titulo() + "\"");
                    conf.setDetalle("Tarea a quitar: \"" + tareaTitulo + "\"");
                }
            }
            default -> {
                return "{\"ok\":false,\"error\":\"Acción de plantilla no reconocida.\"}";
            }
        }

        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(conf);
        return objectMapper.writeValueAsString(Map.of("ok", true, "requiereConfirmacion", true, "titulo", conf.getTitulo()));
    }

    private boolean esEventoNombreGenericoOPlantilla(String eventoNombre, String plantillaQuery) {
        if (eventoNombre.equals(plantillaQuery) || plantillaQuery.contains(eventoNombre) || eventoNombre.contains(plantillaQuery)) {
            return true;
        }
        String sinPalabrasComunes = eventoNombre
                .replaceAll("\\b(todas|todos|las|los|para|en|de|del|ferias|feria|hackathones|hackathon|hackatones|hackaton|concursos|concurso|investigaciones|investigacion|convocatorias|convocatoria|eventos|evento|ninguno|null)\\b", "")
                .trim();
        return sinPalabrasComunes.isBlank();
    }

    private Optional<TipoConvocatoria> parseTipo(String raw) {
        String n = normalizar(raw);
        if (n.contains("feria")) return Optional.of(TipoConvocatoria.FERIA);
        if (n.contains("hack")) return Optional.of(TipoConvocatoria.HACKATHON);
        if (n.contains("concurs")) return Optional.of(TipoConvocatoria.CONCURSO);
        if (n.contains("invest")) return Optional.of(TipoConvocatoria.INVESTIGACION);
        return Optional.empty();
    }

    private String normalizar(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
