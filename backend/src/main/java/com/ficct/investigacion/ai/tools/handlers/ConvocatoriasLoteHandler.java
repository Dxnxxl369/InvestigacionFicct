package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.CopilotoDTO.ConfirmacionPendiente;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.CopilotoDTO.ItemConfirmacion;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.ConvocatoriaService;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class ConvocatoriasLoteHandler {

    private final ConvocatoriaService convocatoriaService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ConvocatoriasLoteHandler(ConvocatoriaService convocatoriaService) {
        this.convocatoriaService = convocatoriaService;
    }

    public String ejecutar(JsonNode args, User user, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            return "{\"ok\":false,\"error\":\"Solo Docentes o Administradores pueden cambiar el estado de convocatorias.\"}";
        }

        String nuevoEstado = args.path("nuevoEstado").asText("").trim().toUpperCase(Locale.ROOT);
        String tipoFiltro = args.path("tipoConvocatoria").asText("").trim().toUpperCase(Locale.ROOT);
        String estadoActualFiltro = args.path("estadoActual").asText("").trim().toUpperCase(Locale.ROOT);
        String tituloQuery = normalizar(args.path("titulo").asText(""));

        if (nuevoEstado.isBlank()) {
            return "{\"ok\":false,\"error\":\"Indica a qué estado deseas cambiar (PUBLICADA, BORRADOR, FINALIZADA o ARCHIVADA).\"}";
        }
        if ("ARCHIVADA".equals(nuevoEstado) && user.getRol() != Rol.ADMIN) {
            return "{\"ok\":false,\"error\":\"Solo un Administrador puede archivar convocatorias.\"}";
        }

        List<ConvocatoriaDTO> areas = user.getRol() == Rol.ADMIN
                ? convocatoriaService.listarAdmin()
                : convocatoriaService.listarMisAreas(user.getEmail());

        List<ConvocatoriaDTO> matches = areas.stream()
                .filter(a -> tipoFiltro.isBlank() || "TODAS".equals(tipoFiltro) || a.getTipo().name().equals(tipoFiltro))
                .filter(a -> estadoActualFiltro.isBlank() || a.getEstado().name().equals(estadoActualFiltro))
                .filter(a -> tituloQuery.isBlank() || normalizar(a.getTitulo()).contains(tituloQuery))
                .filter(a -> !a.getEstado().name().equals(nuevoEstado))
                .toList();

        if (matches.isEmpty()) {
            return objectMapper.writeValueAsString(Map.of(
                    "ok", false,
                    "error", "No encontré convocatorias que coincidan con ese filtro para pasar a " + nuevoEstado + "."
            ));
        }

        List<ItemConfirmacion> items = matches.stream()
                .map(a -> new ItemConfirmacion(
                        a.getId(),
                        a.getTitulo(),
                        a.getTipo().name() + " · Estado actual: " + a.getEstado().name(),
                        true
                ))
                .toList();

        ConfirmacionPendiente conf = new ConfirmacionPendiente();
        conf.setTipoAccion("CAMBIAR_ESTADO_LOTE");
        conf.setTargetId(matches.get(0).getId());
        conf.setValorTexto(nuevoEstado);
        conf.setTitulo(matches.size() == 1
                ? "Cambiar \"" + matches.get(0).getTitulo() + "\" a " + nuevoEstado
                : "Cambiar " + matches.size() + " convocatorias a " + nuevoEstado);
        conf.setDetalle("Revisa y marca las actividades que deseas pasar a " + nuevoEstado + ":");
        conf.setItems(items);

        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(conf);

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "requiereConfirmacion", true,
                "cantidadEncontrada", matches.size(),
                "estadoDestino", nuevoEstado,
                "titulos", matches.stream().map(ConvocatoriaDTO::getTitulo).toList()
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
