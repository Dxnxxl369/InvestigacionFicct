package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.CopilotoDTO.ConfirmacionPendiente;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.PlantillaService;
import com.ficct.investigacion.service.PlantillaService.ActividadDatos;
import com.ficct.investigacion.service.PlantillaService.PlantillaDatos;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class PlantillasFechasHandler {

    private final PlantillaService plantillaService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PlantillasFechasHandler(PlantillaService plantillaService) {
        this.plantillaService = plantillaService;
    }

    public String ejecutar(JsonNode args, User user, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN) {
            return "{\"ok\":false,\"error\":\"Solo Administradores pueden modificar plantillas globales.\"}";
        }

        String plantillaQuery = normalizar(args.path("plantillaNombre").asText(""));
        String actividadQuery = normalizar(args.path("actividadTitulo").asText(""));
        if (actividadQuery.isBlank()) {
            return "{\"ok\":false,\"error\":\"Indica el nombre de la tarea o actividad dentro de la plantilla.\"}";
        }

        List<PlantillaDatos> plantillas = plantillaService.listar();
        PlantillaDatos plantillaMatch = null;
        ActividadDatos actividadMatch = null;

        for (PlantillaDatos p : plantillas) {
            if (!plantillaQuery.isBlank() && !normalizar(p.titulo()).contains(plantillaQuery)) {
                continue;
            }
            if (p.actividades() == null) continue;
            for (ActividadDatos act : p.actividades()) {
                if (normalizar(act.titulo()).contains(actividadQuery)) {
                    plantillaMatch = p;
                    actividadMatch = act;
                    break;
                }
            }
            if (actividadMatch != null) break;
        }

        if (actividadMatch == null || plantillaMatch == null) {
            return "{\"ok\":false,\"error\":\"No encontré esa actividad en las plantillas.\"}";
        }

        String fHab = normalizarFechaInput(args.path("fechaHabilitacion").asText(""), "00:00");
        String fEnt = normalizarFechaInput(args.path("fechaEntrega").asText(""), "23:59");
        String fCor = normalizarFechaInput(args.path("fechaCorte").asText(""), "23:59");

        boolean hab = args.has("habilitada") && !args.get("habilitada").isNull()
                ? args.get("habilitada").asBoolean()
                : Boolean.TRUE.equals(actividadMatch.habilitada());

        ConfirmacionPendiente conf = new ConfirmacionPendiente();
        conf.setTipoAccion("GESTIONAR_PLANTILLA_TAREA");
        conf.setTargetId(plantillaMatch.id());
        conf.setValorTexto(String.valueOf(actividadMatch.id()));
        conf.setHabilitada(hab);
        conf.setTitulo("Editar plantilla: \"" + actividadMatch.titulo() + "\"");
        conf.setDetalle("Plantilla: " + plantillaMatch.titulo() + " (se sincroniza con las aulas asociadas)");
        conf.setFechaHabilitacion(fHab != null ? fHab : formatear(actividadMatch.fechaHabilitacion()));
        conf.setFechaEntrega(fEnt != null ? fEnt : formatear(actividadMatch.fechaEntrega()));
        conf.setFechaCorte(fCor != null ? fCor : formatear(actividadMatch.fechaLimite()));

        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(conf);

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "requiereConfirmacion", true,
                "plantilla", plantillaMatch.titulo(),
                "actividad", actividadMatch.titulo()
        ));
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
}
