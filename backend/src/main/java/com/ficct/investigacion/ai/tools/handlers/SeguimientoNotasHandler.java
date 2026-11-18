package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.ai.harness.CopilotoContextResolver;
import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.CopilotoDTO.ReporteGeneradoDTO;
import com.ficct.investigacion.dto.MejorasDTOs;
import com.ficct.investigacion.dto.TareaDTO;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.TareaService;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;

@Component
public class SeguimientoNotasHandler {

    private final TareaService tareaService;
    private final CopilotoContextResolver contextResolver;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SeguimientoNotasHandler(TareaService tareaService, CopilotoContextResolver contextResolver) {
        this.tareaService = tareaService;
        this.contextResolver = contextResolver;
    }

    public String ejecutar(JsonNode args, User user, String rutaActual, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            return "{\"ok\":false,\"error\":\"Solo Docentes o Administradores pueden consultar seguimiento o exportar notas.\"}";
        }

        String accion = args.path("accion").asText("QUIEN_FALTA").trim().toUpperCase(Locale.ROOT);
        String aulaNombre = args.path("aulaNombre").asText("").trim();
        String tareaTitulo = normalizar(args.path("tareaTitulo").asText(""));

        ConvocatoriaDTO area = contextResolver.resolverConvocatoria(aulaNombre, rutaActual, user);
        if (area == null) {
            return "{\"ok\":false,\"error\":\"Indica el nombre de la convocatoria o actividad.\"}";
        }

        if ("EXPORTAR_NOTAS".equals(accion)) {
            String csv = tareaService.exportNotasConvocatoria(area.getId(), user.getEmail());
            String base64 = Base64.getEncoder().encodeToString(csv.getBytes(StandardCharsets.UTF_8));
            String fname = "notas_" + normalizar(area.getTitulo()).replaceAll("[^a-z0-9]+", "_") + ".csv";

            response.setAccion("REPORTE_PDF");
            response.setReporteGenerado(new ReporteGeneradoDTO(
                    "Notas: " + area.getTitulo(),
                    "Planilla CSV de calificaciones lista para abrir en Excel",
                    fname,
                    base64,
                    "/dashboard/convocatorias/" + area.getId() + "?tab=tareas"
            ));
            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "actividad", area.getTitulo(),
                    "archivo", fname
            ));
        }

        // QUIEN_FALTA
        List<TareaDTO> tareas = tareaService.listarPorConvocatoria(area.getId(), user.getEmail());
        TareaDTO target = null;
        for (TareaDTO t : tareas) {
            if (!tareaTitulo.isBlank() && normalizar(t.getTitulo()).contains(tareaTitulo)) {
                target = t;
                break;
            }
        }
        if (target == null && !tareas.isEmpty()) {
            target = tareas.get(0);
        }
        if (target == null) {
            return "{\"ok\":false,\"error\":\"No hay tareas registradas en esa actividad.\"}";
        }

        List<MejorasDTOs.PendienteTarea> faltantes = tareaService.getPendientes(target.getId(), user.getEmail());
        List<String> nombres = faltantes.stream()
                .map(p -> p.destinatario() + (p.codigoGrupo() != null && !p.codigoGrupo().isBlank() ? " (" + p.codigoGrupo() + ")" : ""))
                .limit(20)
                .toList();

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "actividad", area.getTitulo(),
                "tarea", target.getTitulo(),
                "totalFaltantes", faltantes.size(),
                "faltantes", nombres
        ));
    }

    private String normalizar(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
