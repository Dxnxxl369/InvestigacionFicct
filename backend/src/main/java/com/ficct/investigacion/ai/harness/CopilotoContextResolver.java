package com.ficct.investigacion.ai.harness;

import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.ConvocatoriaService;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class CopilotoContextResolver {

    private static final Pattern CONVOCATORIA_PATH_PATTERN = Pattern.compile("/dashboard/convocatorias/(\\d+)");

    private final ConvocatoriaService convocatoriaService;

    public CopilotoContextResolver(ConvocatoriaService convocatoriaService) {
        this.convocatoriaService = convocatoriaService;
    }

    public Long extraerConvocatoriaIdDeRuta(String rutaActual) {
        if (rutaActual == null || rutaActual.isBlank()) return null;
        Matcher m = CONVOCATORIA_PATH_PATTERN.matcher(rutaActual);
        if (m.find()) {
            try {
                return Long.parseLong(m.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    public ConvocatoriaDTO resolverConvocatoria(String aulaNombre, String rutaActual, User user) {
        List<ConvocatoriaDTO> areas = user.getRol() == Rol.ADMIN
                ? convocatoriaService.listarAdmin()
                : convocatoriaService.listarMisAreas(user.getEmail());

        if (aulaNombre != null && !aulaNombre.isBlank()) {
            String query = normalizar(aulaNombre);
            for (ConvocatoriaDTO area : areas) {
                if (normalizar(area.getTitulo()).contains(query)) {
                    return area;
                }
            }
        }

        Long rutaId = extraerConvocatoriaIdDeRuta(rutaActual);
        if (rutaId != null) {
            for (ConvocatoriaDTO area : areas) {
                if (rutaId.equals(area.getId())) {
                    return area;
                }
            }
        }

        if (areas.size() == 1) {
            return areas.get(0);
        }
        return null;
    }

    public String describirContextoRuta(String rutaActual, User user) {
        Long convId = extraerConvocatoriaIdDeRuta(rutaActual);
        if (convId == null) return "Dashboard general";
        try {
            ConvocatoriaDTO dto = convocatoriaService.obtenerPorIdConUsuario(convId, user.getEmail());
            return "Dentro del aula \"" + dto.getTitulo() + "\" (" + dto.getTipo().name() + ")";
        } catch (Exception e) {
            return "Dentro de un aula específica";
        }
    }

    private String normalizar(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
