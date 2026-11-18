package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.ai.harness.CopilotoContextResolver;
import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.ConvocatoriaParticipanteDTO;
import com.ficct.investigacion.dto.CopilotoDTO.ConfirmacionPendiente;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.CopilotoDTO.ItemConfirmacion;
import com.ficct.investigacion.model.EstadoInscripcion;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.ConvocatoriaService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class InscripcionesHandler {

    private final ConvocatoriaService convocatoriaService;
    private final CopilotoContextResolver contextResolver;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InscripcionesHandler(ConvocatoriaService convocatoriaService, CopilotoContextResolver contextResolver) {
        this.convocatoriaService = convocatoriaService;
        this.contextResolver = contextResolver;
    }

    public String ejecutar(JsonNode args, User user, String rutaActual, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            return "{\"ok\":false,\"error\":\"Solo Docentes o Administradores pueden gestionar inscripciones.\"}";
        }

        String accion = args.path("accion").asText("LISTAR_PENDIENTES").trim().toUpperCase(Locale.ROOT);
        String aulaNombre = args.path("aulaNombre").asText("").trim();

        ConvocatoriaDTO area = contextResolver.resolverConvocatoria(aulaNombre, rutaActual, user);
        if (area == null) {
            return "{\"ok\":false,\"error\":\"Indica el nombre de la convocatoria para revisar sus inscripciones.\"}";
        }

        List<ConvocatoriaParticipanteDTO> participantes = convocatoriaService.listarParticipantes(area.getId(), user.getEmail());
        List<ConvocatoriaParticipanteDTO> pendientes = participantes.stream()
                .filter(p -> p.getRol() == Rol.ESTUDIANTE && p.getEstadoInscripcion() == EstadoInscripcion.PENDIENTE)
                .toList();

        if (pendientes.isEmpty()) {
            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "actividad", area.getTitulo(),
                    "pendientesCount", 0,
                    "mensaje", "No hay inscripciones pendientes por revisar en " + area.getTitulo()
            ));
        }

        boolean rechazar = "RECHAZAR_PENDIENTES".equals(accion);
        List<ItemConfirmacion> items = pendientes.stream()
                .map(p -> new ItemConfirmacion(
                        p.getId(),
                        ((p.getNombre() != null ? p.getNombre() : "") + " " + (p.getApellidos() != null ? p.getApellidos() : "")).trim(),
                        (p.getNombreEquipo() != null && !p.getNombreEquipo().isBlank() ? "Equipo: " + p.getNombreEquipo() + " · " : "")
                                + (p.getEmail() != null ? p.getEmail() : ""),
                        true
                ))
                .toList();

        ConfirmacionPendiente conf = new ConfirmacionPendiente();
        conf.setTipoAccion("RESOLVER_INSCRIPCIONES_LOTE");
        conf.setTargetId(area.getId());
        conf.setValorTexto(rechazar ? "RECHAZAR" : "ACEPTAR");
        conf.setTitulo((rechazar ? "Rechazar " : "Admitir ") + items.size() + " inscripción(es) en \"" + area.getTitulo() + "\"");
        conf.setDetalle("Revisa y marca los postulantes que deseas " + (rechazar ? "rechazar" : "admitir") + ":");
        conf.setItems(items);

        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(conf);

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "requiereConfirmacion", true,
                "actividad", area.getTitulo(),
                "pendientesCount", items.size(),
                "accion", rechazar ? "RECHAZAR" : "ACEPTAR"
        ));
    }
}
