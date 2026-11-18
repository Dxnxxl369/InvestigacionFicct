package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.ai.harness.CopilotoContextResolver;
import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.CopilotoDTO.ConfirmacionPendiente;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.CopilotoDTO.OpcionNavegacion;
import com.ficct.investigacion.dto.GruposAreaResponse;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.GrupoService;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class GruposEquiposHandler {

    private final GrupoService grupoService;
    private final CopilotoContextResolver contextResolver;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GruposEquiposHandler(GrupoService grupoService, CopilotoContextResolver contextResolver) {
        this.grupoService = grupoService;
        this.contextResolver = contextResolver;
    }

    public String ejecutar(JsonNode args, User user, String rutaActual, CopilotoResponse response) throws Exception {
        String accion = args.path("accion").asText("VER_GRUPOS").trim().toUpperCase(Locale.ROOT);
        String aulaNombre = args.path("aulaNombre").asText("").trim();

        ConvocatoriaDTO area = contextResolver.resolverConvocatoria(aulaNombre, rutaActual, user);
        if (area == null) {
            return "{\"ok\":false,\"error\":\"Indica el nombre de la convocatoria/feria para consultar o gestionar sus grupos.\"}";
        }

        if ("GENERAR_LOTE".equals(accion)) {
            if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
                return "{\"ok\":false,\"error\":\"Solo Docentes o Administradores pueden generar grupos.\"}";
            }
            int cantidad = Math.max(1, Math.min(50, args.path("cantidad").asInt(5)));
            int cupoMaximo = Math.max(1, Math.min(20, args.path("cupoMaximo").asInt(4)));

            ConfirmacionPendiente conf = new ConfirmacionPendiente();
            conf.setTipoAccion("GENERAR_GRUPOS_LOTE");
            conf.setTargetId(area.getId());
            conf.setValorTexto(cantidad + ":" + cupoMaximo);
            conf.setTitulo("Generar " + cantidad + " grupos en \"" + area.getTitulo() + "\"");
            conf.setDetalle("Cupo máximo por grupo: " + cupoMaximo + " integrantes");

            response.setAccion("CONFIRMAR_ACCION");
            response.setConfirmacionPendiente(conf);

            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "requiereConfirmacion", true,
                    "actividad", area.getTitulo(),
                    "cantidad", cantidad,
                    "cupoMaximo", cupoMaximo
            ));
        }

        GruposAreaResponse datos = grupoService.obtenerGruposArea(area.getId());
        if ("ESTUDIANTES_SIN_GRUPO".equals(accion)) {
            if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
                return "{\"ok\":false,\"error\":\"Solo Docentes o Administradores pueden ver el listado completo sin grupo.\"}";
            }
            List<String> sinGrupo = datos.getEstudiantesSinEquipo().stream()
                    .map(p -> (p.getNombre() != null ? p.getNombre() : "") + " " + (p.getApellidos() != null ? p.getApellidos() : ""))
                    .map(String::trim)
                    .toList();
            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "actividad", area.getTitulo(),
                    "cantidadSinGrupo", sinGrupo.size(),
                    "estudiantesSinGrupo", sinGrupo
            ));
        }

        // VER_GRUPOS
        String ruta = "/dashboard/convocatorias/" + area.getId() + "?tab=grupos";
        List<Map<String, Object>> resumen = new ArrayList<>();
        List<OpcionNavegacion> opciones = new ArrayList<>();
        for (var g : datos.getGrupos()) {
            int ocupados = g.getMiembros() != null ? g.getMiembros().size() : 0;
            int max = g.getCapacidadMaxima() != null ? g.getCapacidadMaxima() : 4;
            int libres = Math.max(0, max - ocupados);
            boolean esMiGrupo = g.getMiembros() != null && g.getMiembros().stream()
                    .anyMatch(m -> m.getUsuarioId().equals(user.getId()));
            resumen.add(Map.of(
                    "nombre", g.getNombre(),
                    "ocupados", ocupados,
                    "capacidad", max,
                    "libres", libres,
                    "esMiGrupo", esMiGrupo
            ));
            opciones.add(new OpcionNavegacion(
                    g.getNombre() + (esMiGrupo ? " (Tu grupo)" : ""),
                    area.getTitulo() + " · " + ocupados + "/" + max + " integrantes",
                    ruta,
                    libres > 0 ? libres + " cupo(s)" : "Completo",
                    "NAVEGAR"
            ));
        }
        if (!opciones.isEmpty()) {
            response.setOpciones(opciones);
            response.setAccion("MOSTRAR_OPCIONES");
        }
        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "actividad", area.getTitulo(),
                "totalGrupos", resumen.size(),
                "sinGrupoCount", datos.getEstudiantesSinEquipo() != null ? datos.getEstudiantesSinEquipo().size() : 0,
                "grupos", resumen
        ));
    }
}
