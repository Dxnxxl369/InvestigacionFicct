package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.MejorasDTOs.NotificacionDTO;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.NotificacionService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class NotificacionesHandler {

    private final NotificacionService notificacionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NotificacionesHandler(NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
    }

    public String ejecutar(JsonNode args, User user) throws Exception {
        String accion = args.path("accion").asText("RESUMEN").trim().toUpperCase(Locale.ROOT);
        String email = user.getEmail();

        if ("MARCAR_LEIDAS".equals(accion)) {
            notificacionService.marcarTodasLeidas(email);
            return "{\"ok\":true,\"mensaje\":\"Todas tus notificaciones quedaron marcadas como leídas.\"}";
        }

        Map<String, Long> conteo = notificacionService.contarNoLeidas(email);
        List<NotificacionDTO> recientes = notificacionService.listar(email, 6);
        List<Map<String, Object>> resumen = recientes.stream()
                .map(n -> Map.<String, Object>of(
                        "titulo", n.titulo(),
                        "mensaje", n.mensaje(),
                        "leida", n.leida()
                ))
                .toList();

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "noLeidas", conteo.getOrDefault("noLeidas", 0L),
                "recientes", resumen
        ));
    }
}
