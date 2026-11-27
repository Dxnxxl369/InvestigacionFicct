package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.model.Convocatoria;
import com.ficct.investigacion.model.EstadoConvocatoria;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.TipoConvocatoria;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.ConvocatoriaRepository;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.*;

@Component
public class ConvocatoriasConsultaHandler {

    private final ConvocatoriaRepository convocatoriaRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ConvocatoriasConsultaHandler(ConvocatoriaRepository convocatoriaRepository) {
        this.convocatoriaRepository = convocatoriaRepository;
    }

    public String ejecutar(JsonNode args, User user) throws Exception {
        String tipoRaw = normalizar(args.path("tipoConvocatoria").asText(""));
        String estadoRaw = normalizar(args.path("estado").asText(""));
        String tituloQuery = normalizar(args.path("titulo").asText(""));

        TipoConvocatoria tipoFiltro = parseTipo(tipoRaw).orElse(null);
        EstadoConvocatoria estadoFiltro = parseEstado(estadoRaw).orElse(null);
        boolean soloPublicadas = user.getRol() == Rol.ESTUDIANTE || user.getRol() == Rol.JURADO;

        List<Convocatoria> todas = convocatoriaRepository.findAll();
        List<Map<String, Object>> filtradas = new ArrayList<>();
        Map<String, Long> porTipo = new LinkedHashMap<>();
        Map<String, Long> porEstado = new LinkedHashMap<>();

        for (Convocatoria c : todas) {
            if (soloPublicadas && c.getEstado() != EstadoConvocatoria.PUBLICADA) {
                continue;
            }
            if (tipoFiltro != null && c.getTipo() != tipoFiltro) {
                continue;
            }
            if (estadoFiltro != null && c.getEstado() != estadoFiltro) {
                continue;
            }
            if (!tituloQuery.isBlank() && !normalizar(c.getTitulo()).contains(tituloQuery)) {
                continue;
            }
            porTipo.merge(c.getTipo().name(), 1L, Long::sum);
            porEstado.merge(c.getEstado().name(), 1L, Long::sum);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", c.getId());
            item.put("titulo", c.getTitulo());
            item.put("tipo", c.getTipo().name());
            item.put("estado", c.getEstado().name());
            item.put("modalidad", c.getModalidadInscripcion() != null ? c.getModalidadInscripcion().name() : "");
            item.put("fechaCierre", c.getFechaCierre() != null ? c.getFechaCierre().toString() : "");
            filtradas.add(item);
        }

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "totalEncontradas", filtradas.size(),
                "totalCatalogo", todas.size(),
                "resumenPorTipo", porTipo,
                "resumenPorEstado", porEstado,
                "convocatorias", filtradas.size() > 20 ? filtradas.subList(0, 20) : filtradas
        ));
    }

    private Optional<TipoConvocatoria> parseTipo(String n) {
        if (n.isBlank() || n.contains("todas") || n.contains("todos")) return Optional.empty();
        if (n.contains("feria")) return Optional.of(TipoConvocatoria.FERIA);
        if (n.contains("hack")) return Optional.of(TipoConvocatoria.HACKATHON);
        if (n.contains("concurs")) return Optional.of(TipoConvocatoria.CONCURSO);
        if (n.contains("invest")) return Optional.of(TipoConvocatoria.INVESTIGACION);
        return Optional.empty();
    }

    private Optional<EstadoConvocatoria> parseEstado(String n) {
        if (n.isBlank() || n.contains("todos") || n.contains("todas")) return Optional.empty();
        if (n.contains("borrador")) return Optional.of(EstadoConvocatoria.BORRADOR);
        if (n.contains("publicad") || n.contains("activ") || n.contains("abiert")) return Optional.of(EstadoConvocatoria.PUBLICADA);
        if (n.contains("finaliz") || n.contains("cerrad")) return Optional.of(EstadoConvocatoria.FINALIZADA);
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
