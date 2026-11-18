package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.CopilotoDTO.OpcionNavegacion;
import com.ficct.investigacion.service.BibliotecaService;
import com.ficct.investigacion.service.BibliotecaService.DocumentoDatos;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class BibliotecaBusquedaHandler {

    private final BibliotecaService bibliotecaService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public BibliotecaBusquedaHandler(BibliotecaService bibliotecaService) {
        this.bibliotecaService = bibliotecaService;
    }

    public String ejecutar(JsonNode args, CopilotoResponse response) throws Exception {
        String consulta = args.path("consulta").asText("").trim();
        String area = args.path("area").asText("").trim();

        List<DocumentoDatos> docs = bibliotecaService.buscar(
                consulta.isBlank() ? null : consulta,
                null,
                area.isBlank() ? null : area,
                null
        );

        if (docs.isEmpty()) {
            return "{\"ok\":true,\"encontrados\":0,\"mensaje\":\"No encontré proyectos en la biblioteca con esos términos.\"}";
        }

        List<DocumentoDatos> top = docs.stream().limit(6).toList();
        List<OpcionNavegacion> opciones = top.stream()
                .map(d -> new OpcionNavegacion(
                        d.titulo(),
                        (d.categoria() != null ? d.categoria() : "Proyecto") + (d.area() != null ? " · " + d.area() : ""),
                        "/dashboard/biblioteca",
                        d.nivel() != null ? d.nivel() : (d.creadoEn() != null ? String.valueOf(d.creadoEn().getYear()) : "Ver"),
                        "NAVEGAR"
                ))
                .toList();

        response.setOpciones(opciones);
        response.setAccion("MOSTRAR_OPCIONES");

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "encontrados", docs.size(),
                "mostrados", top.size(),
                "titulos", top.stream().map(DocumentoDatos::titulo).toList()
        ));
    }
}
