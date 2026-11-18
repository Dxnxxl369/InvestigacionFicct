package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.CopilotoDTO.ConfirmacionPendiente;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.CopilotoDTO.ItemConfirmacion;
import com.ficct.investigacion.dto.CopilotoDTO.OpcionNavegacion;
import com.ficct.investigacion.dto.TareaDTO;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.ConvocatoriaService;
import com.ficct.investigacion.service.TareaService;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class TareasLoteHandler {

    private final ConvocatoriaService convocatoriaService;
    private final TareaService tareaService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TareasLoteHandler(ConvocatoriaService convocatoriaService, TareaService tareaService) {
        this.convocatoriaService = convocatoriaService;
        this.tareaService = tareaService;
    }

    public String ejecutar(JsonNode args, User user, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            return "{\"ok\":false,\"error\":\"Solo Docentes o Administradores pueden habilitar, cerrar o editar tareas.\"}";
        }

        String accion = args.path("accion").asText("HABILITAR").trim().toUpperCase(Locale.ROOT);
        String tipoFiltro = args.path("tipoConvocatoria").asText("").trim().toUpperCase(Locale.ROOT);
        String aulaQuery = normalizar(args.path("aulaNombre").asText(""));
        String moduloQuery = normalizar(args.path("moduloNombre").asText(""));
        String tareaQuery = normalizar(args.path("tareaTitulo").asText(""));
        boolean aplicarATodas = args.path("aplicarATodas").asBoolean(false)
                || tareaQuery.isBlank()
                || "todas".equals(tareaQuery)
                || "todos".equals(tareaQuery)
                || "all".equals(tareaQuery);

        String fHabInput = normalizarFechaInput(args.path("fechaHabilitacion").asText(""), "00:00");
        String fEntInput = normalizarFechaInput(args.path("fechaEntrega").asText(""), "23:59");
        String fCorInput = normalizarFechaInput(args.path("fechaCorte").asText(""), "23:59");

        List<ConvocatoriaDTO> areas = user.getRol() == Rol.ADMIN
                ? convocatoriaService.listarAdmin()
                : convocatoriaService.listarMisAreas(user.getEmail());

        if (aplicarATodas) {
            return prepararLote(areas, accion, tipoFiltro, aulaQuery, moduloQuery, fHabInput, fEntInput, fCorInput, user, response);
        }

        List<TareaMatch> candidatos = new ArrayList<>();
        for (ConvocatoriaDTO area : areas) {
            if (!tipoFiltro.isBlank() && !"TODAS".equals(tipoFiltro) && !area.getTipo().name().equals(tipoFiltro)) {
                continue;
            }
            String areaNorm = normalizar(area.getTitulo());
            List<TareaDTO> tareas = tareaService.listarPorConvocatoria(area.getId(), user.getEmail());
            for (TareaDTO t : tareas) {
                String tareaNorm = normalizar(t.getTitulo());
                String modNorm = t.getModuloTitulo() != null ? normalizar(t.getModuloTitulo()) : "";
                if (!coincideFlexible(tareaNorm, tareaQuery)) continue;

                int score = 1;
                if (!moduloQuery.isBlank() && coincideFlexible(modNorm, moduloQuery)) score += 3;
                if (!aulaQuery.isBlank() && (coincideFlexible(areaNorm, aulaQuery) || coincideFlexible(modNorm, aulaQuery))) score += 2;
                if ("HABILITAR".equals(accion) && !t.isHabilitada()) score += 2;
                if ("DESHABILITAR".equals(accion) && t.isHabilitada()) score += 2;
                candidatos.add(new TareaMatch(area, t, score));
            }
        }

        if (candidatos.isEmpty()) {
            return objectMapper.writeValueAsString(Map.of(
                    "ok", false,
                    "error", "No encontré ninguna tarea que coincida con '" + args.path("tareaTitulo").asText("") + "'."
            ));
        }

        int maxScore = candidatos.stream().mapToInt(m -> m.score).max().orElse(1);
        List<TareaMatch> mejores = candidatos.stream().filter(m -> m.score == maxScore).toList();

        if (mejores.size() > 1) {
            List<OpcionNavegacion> opciones = mejores.stream()
                    .map(m -> new OpcionNavegacion(
                            m.tarea.getTitulo(),
                            m.area.getTitulo() + (m.tarea.getModuloTitulo() != null ? " · " + m.tarea.getModuloTitulo() : ""),
                            "/dashboard/convocatorias/" + m.area.getId() + "?tab=tareas",
                            m.tarea.isHabilitada() ? "Habilitada" : "Deshabilitada",
                            "NAVEGAR"
                    ))
                    .toList();
            response.setOpciones(opciones);
            response.setAccion("MOSTRAR_OPCIONES");
            return objectMapper.writeValueAsString(Map.of(
                    "ok", false,
                    "error", "Encontré " + mejores.size() + " tareas coincidentes. Pide al usuario indicar de cuál aula o módulo desea configurarla."
            ));
        }

        TareaMatch unico = mejores.get(0);
        boolean habilitadaFinal = switch (accion) {
            case "HABILITAR" -> true;
            case "DESHABILITAR" -> false;
            default -> unico.tarea.isHabilitada();
        };

        String moduloNombre = unico.tarea.getModuloTitulo() != null ? unico.tarea.getModuloTitulo() : "General";
        ConfirmacionPendiente conf = new ConfirmacionPendiente(
                "GESTIONAR_TAREA",
                ("HABILITAR".equals(accion) ? "Habilitar " : "DESHABILITAR".equals(accion) ? "Deshabilitar " : "Configurar fechas de ")
                        + "\"" + unico.tarea.getTitulo() + "\"",
                unico.area.getTipo().name() + " · " + unico.area.getTitulo() + " · " + moduloNombre,
                unico.tarea.getId(),
                null,
                habilitadaFinal
        );
        conf.setAulaNombre(unico.area.getTitulo());
        conf.setModuloNombre(moduloNombre);
        conf.setTipoActividad(unico.area.getTipo().name());
        conf.setFechaHabilitacion(fHabInput != null ? fHabInput : formatear(unico.tarea.getFechaHabilitacion()));
        conf.setFechaEntrega(fEntInput != null ? fEntInput : formatear(unico.tarea.getFechaEntrega() != null ? unico.tarea.getFechaEntrega() : unico.tarea.getFechaLimite()));
        conf.setFechaCorte(fCorInput != null ? fCorInput : formatear(unico.tarea.getFechaCorte()));

        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(conf);

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "requiereConfirmacion", true,
                "tarea", unico.tarea.getTitulo(),
                "modulo", moduloNombre,
                "actividad", unico.area.getTitulo(),
                "estadoActual", unico.tarea.isHabilitada() ? "Habilitada" : "Deshabilitada"
        ));
    }

    private String prepararLote(List<ConvocatoriaDTO> areas, String accion, String tipoFiltro,
                                String aulaQuery, String moduloQuery,
                                String fHab, String fEnt, String fCor,
                                User user, CopilotoResponse response) throws Exception {
        List<ItemConfirmacion> items = new ArrayList<>();
        Boolean habilitadaDeseada = "HABILITAR".equals(accion) ? Boolean.TRUE
                : "DESHABILITAR".equals(accion) ? Boolean.FALSE : null;

        for (ConvocatoriaDTO area : areas) {
            if (!tipoFiltro.isBlank() && !"TODAS".equals(tipoFiltro) && !area.getTipo().name().equals(tipoFiltro)) {
                continue;
            }
            if (!aulaQuery.isBlank() && !coincideFlexible(normalizar(area.getTitulo()), aulaQuery)) {
                continue;
            }
            List<TareaDTO> tareas = tareaService.listarPorConvocatoria(area.getId(), user.getEmail());
            for (TareaDTO t : tareas) {
                String modNom = t.getModuloTitulo() != null ? t.getModuloTitulo() : "General";
                if (!moduloQuery.isBlank() && !coincideFlexible(normalizar(modNom), moduloQuery)) {
                    continue;
                }
                if (habilitadaDeseada != null && t.isHabilitada() == habilitadaDeseada) {
                    continue; // Ya esta en el estado deseado
                }
                items.add(new ItemConfirmacion(
                        t.getId(),
                        t.getTitulo(),
                        area.getTitulo() + " · " + modNom + " (" + (t.isHabilitada() ? "Habilitada" : "Deshabilitada") + ")",
                        true
                ));
            }
        }

        if (items.isEmpty()) {
            return objectMapper.writeValueAsString(Map.of(
                    "ok", false,
                    "error", "No encontré tareas pendientes de ese cambio con los filtros indicados."
            ));
        }

        String verbo = "HABILITAR".equals(accion) ? "Habilitar "
                : "DESHABILITAR".equals(accion) ? "Cerrar / deshabilitar " : "Actualizar fechas de ";

        ConfirmacionPendiente conf = new ConfirmacionPendiente();
        conf.setTipoAccion("GESTIONAR_TAREAS_LOTE");
        conf.setTargetId(items.get(0).getId());
        conf.setHabilitada(habilitadaDeseada);
        conf.setTitulo(verbo + items.size() + " tarea(s)");
        conf.setDetalle("Revisa y marca las tareas sobre las que deseas aplicar este cambio:");
        conf.setItems(items);
        conf.setFechaHabilitacion(fHab);
        conf.setFechaEntrega(fEnt);
        conf.setFechaCorte(fCor);

        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(conf);

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "requiereConfirmacion", true,
                "cantidadTareas", items.size(),
                "accion", accion
        ));
    }

    private boolean coincideFlexible(String texto, String query) {
        if (texto == null || query == null || query.isBlank()) return false;
        if (texto.contains(query)) return true;
        String[] tokens = query.split("\\s+");
        for (String tok : tokens) {
            if (tok.length() >= 3 && !texto.contains(tok)) return false;
        }
        return tokens.length > 0;
    }

    private String normalizarFechaInput(String raw, String horaDefault) {
        if (raw == null || raw.isBlank()) return null;
        String clean = raw.trim();
        if (clean.length() == 10) return clean + "T" + horaDefault;
        if (clean.length() >= 16) return clean.substring(0, 16);
        return clean;
    }

    private String formatear(LocalDateTime dt) {
        return dt == null ? "" : dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
    }

    private String normalizar(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private record TareaMatch(ConvocatoriaDTO area, TareaDTO tarea, int score) {}
}
