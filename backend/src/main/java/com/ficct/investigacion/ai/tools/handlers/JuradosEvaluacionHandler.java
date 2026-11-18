package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.ai.harness.CopilotoContextResolver;
import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.CopilotoDTO.OpcionNavegacion;
import com.ficct.investigacion.dto.EntregaTareaDTO;
import com.ficct.investigacion.dto.JuradosConvocatoriaDTO;
import com.ficct.investigacion.dto.TareaDTO;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.EvaluacionJuradoService;
import com.ficct.investigacion.service.JuradoAsignacionService;
import com.ficct.investigacion.service.TareaService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.Normalizer;
import java.util.*;

/**
 * Handler de apoyo a Jurados y Docentes (SOLO lectura, asignacion y resumen de PDFs).
 * Prohibido asignar o modificar calificaciones desde el agente.
 */
@Component
public class JuradosEvaluacionHandler {

    private final JuradoAsignacionService juradoAsignacionService;
    private final EvaluacionJuradoService evaluacionJuradoService;
    private final TareaService tareaService;
    private final CopilotoContextResolver contextResolver;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public JuradosEvaluacionHandler(JuradoAsignacionService juradoAsignacionService,
                                    EvaluacionJuradoService evaluacionJuradoService,
                                    TareaService tareaService,
                                    CopilotoContextResolver contextResolver) {
        this.juradoAsignacionService = juradoAsignacionService;
        this.evaluacionJuradoService = evaluacionJuradoService;
        this.tareaService = tareaService;
        this.contextResolver = contextResolver;
    }

    public String ejecutar(JsonNode args, User user, String rutaActual, CopilotoResponse response) throws Exception {
        String accion = args.path("accion").asText("ESTADO_JURADOS").trim().toUpperCase(Locale.ROOT);
        String aulaNombre = args.path("aulaNombre").asText("").trim();

        if ("RESUMIR_ENTREGA".equals(accion)) {
            return resumirEntregaPdf(args, user, rutaActual);
        }

        if (user.getRol() == Rol.JURADO) {
            var grupos = evaluacionJuradoService.misGrupos(user.getEmail());
            List<Map<String, Object>> lista = grupos.stream()
                    .map(g -> Map.<String, Object>of(
                            "convocatoria", g.convocatoriaTitulo(),
                            "grupo", g.nombre(),
                            "evaluado", g.evaluado()
                    ))
                    .toList();
            if (!grupos.isEmpty()) {
                response.setOpciones(List.of(new OpcionNavegacion(
                        "Ir al Panel de Jurado",
                        grupos.size() + " grupo(s) asignados",
                        "/dashboard/jurado",
                        grupos.stream().filter(g -> !g.evaluado()).count() + " pendiente(s)",
                        "NAVEGAR"
                )));
                response.setAccion("MOSTRAR_OPCIONES");
            }
            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "totalGrupos", grupos.size(),
                    "pendientes", grupos.stream().filter(g -> !g.evaluado()).count(),
                    "grupos", lista
            ));
        }

        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            return "{\"ok\":false,\"error\":\"Solo Jurados, Docentes o Administradores pueden consultar evaluaciones.\"}";
        }

        ConvocatoriaDTO area = contextResolver.resolverConvocatoria(aulaNombre, rutaActual, user);
        if (area == null) {
            return "{\"ok\":false,\"error\":\"Indica el nombre de la convocatoria para revisar los jurados.\"}";
        }

        JuradosConvocatoriaDTO datos = juradoAsignacionService.listar(area.getId(), user.getEmail());
        response.setOpciones(List.of(new OpcionNavegacion(
                "Gestionar Jurados en " + area.getTitulo(),
                datos.jurados().size() + " jurado(s) · " + datos.proyectos().size() + " proyecto/grupo(s)",
                "/dashboard/convocatorias/" + area.getId() + "?tab=jurados",
                "Abrir",
                "NAVEGAR"
        )));
        response.setAccion("MOSTRAR_OPCIONES");

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "actividad", area.getTitulo(),
                "totalJurados", datos.jurados().size(),
                "totalGrupos", datos.proyectos().size()
        ));
    }

    private String resumirEntregaPdf(JsonNode args, User user, String rutaActual) throws Exception {
        if (user.getRol() == Rol.ESTUDIANTE) {
            return "{\"ok\":false,\"error\":\"Solo Jurados, Docentes o Administradores pueden solicitar resúmenes de entregas.\"}";
        }

        String grupoQuery = normalizar(args.path("grupoNombre").asText(""));
        String aulaNombre = args.path("aulaNombre").asText("").trim();

        ConvocatoriaDTO area = contextResolver.resolverConvocatoria(aulaNombre, rutaActual, user);
        if (area == null) {
            return "{\"ok\":false,\"error\":\"Indica la convocatoria o actividad donde está la entrega.\"}";
        }

        List<TareaDTO> tareas = tareaService.listarPorConvocatoria(area.getId(), user.getEmail());
        EntregaTareaDTO encontrada = null;

        for (TareaDTO t : tareas) {
            try {
                List<EntregaTareaDTO> entregas = tareaService.listarEntregasPorTarea(t.getId(), user.getEmail());
                for (EntregaTareaDTO e : entregas) {
                    if (e.getArchivoUrl() == null || !e.getArchivoUrl().toLowerCase(Locale.ROOT).endsWith(".pdf")) {
                        continue;
                    }
                    if (grupoQuery.isBlank()
                            || (e.getGrupoNombre() != null && normalizar(e.getGrupoNombre()).contains(grupoQuery))
                            || (e.getEstudianteNombre() != null && normalizar(e.getEstudianteNombre()).contains(grupoQuery))) {
                        encontrada = e;
                        break;
                    }
                }
            } catch (Exception ignored) {}
            if (encontrada != null) break;
        }

        if (encontrada == null) {
            return "{\"ok\":false,\"error\":\"No encontré ninguna entrega PDF que coincida para resumir.\"}";
        }

        String textoExtraido = extraerTextoPdf(encontrada.getArchivoUrl());
        if (textoExtraido.isBlank()) {
            return "{\"ok\":false,\"error\":\"El PDF no contiene texto seleccionable o no está disponible en disco.\"}";
        }

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "instruccion", "Resume brevemente los puntos clave del documento sin asignar ni sugerir ninguna nota numérica.",
                "grupo", encontrada.getGrupoNombre() != null ? encontrada.getGrupoNombre() : encontrada.getEstudianteNombre(),
                "tarea", encontrada.getTareaTitulo() != null ? encontrada.getTareaTitulo() : "",
                "extractoPdf", textoExtraido
        ));
    }

    private String extraerTextoPdf(String archivoUrl) {
        try {
            String nombreArchivo = Paths.get(archivoUrl).getFileName().toString();
            Path ruta = Paths.get(uploadDir).resolve(nombreArchivo).normalize();
            File f = ruta.toFile();
            if (!f.exists()) return "";

            try (PDDocument doc = Loader.loadPDF(f)) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setEndPage(Math.min(5, doc.getNumberOfPages()));
                String text = stripper.getText(doc).replaceAll("\\s+", " ").trim();
                return text.length() > 3000 ? text.substring(0, 3000) : text;
            }
        } catch (Exception e) {
            return "";
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
