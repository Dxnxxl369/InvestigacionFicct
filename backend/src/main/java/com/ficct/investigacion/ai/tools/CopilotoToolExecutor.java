package com.ficct.investigacion.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.CopilotoDTO.*;
import com.ficct.investigacion.dto.EntregaTareaDTO;
import com.ficct.investigacion.dto.ReporteGenerativoDTO.ConsultaRequest;
import com.ficct.investigacion.dto.ReporteGenerativoDTO.ConsultaResponse;
import com.ficct.investigacion.dto.TareaDTO;
import com.ficct.investigacion.model.EstadoEntrega;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.service.ConvocatoriaService;
import com.ficct.investigacion.service.EvaluacionJuradoService;
import com.ficct.investigacion.service.ReporteGenerativoService;
import com.ficct.investigacion.service.TareaService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;

@Component
public class CopilotoToolExecutor {

    private static final Logger log = LoggerFactory.getLogger(CopilotoToolExecutor.class);

    private final ConvocatoriaService convocatoriaService;
    private final TareaService tareaService;
    private final EvaluacionJuradoService evaluacionJuradoService;
    private final ReporteGenerativoService reporteGenerativoService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CopilotoToolExecutor(ConvocatoriaService convocatoriaService,
                                TareaService tareaService,
                                EvaluacionJuradoService evaluacionJuradoService,
                                ReporteGenerativoService reporteGenerativoService) {
        this.convocatoriaService = convocatoriaService;
        this.tareaService = tareaService;
        this.evaluacionJuradoService = evaluacionJuradoService;
        this.reporteGenerativoService = reporteGenerativoService;
    }

    public String ejecutar(String fnName, String argsRaw, User user, CopilotoResponse response) {
        try {
            JsonNode args = objectMapper.readTree(argsRaw != null && !argsRaw.isBlank() ? argsRaw : "{}");
            return switch (fnName) {
                case "consultar_mis_aulas_y_pendientes" -> ejecutarConsultarAulas(user, response);
                case "navegar_a" -> ejecutarNavegar(args, user, response);
                case "gestionar_tarea_modulo" -> ejecutarGestionarTarea(args, user, response);
                case "gestionar_convocatoria" -> ejecutarGestionarConvocatoria(args, user, response);
                case "generar_reporte_pdf" -> ejecutarGenerarReportePdf(args, user, response);
                case "abrir_agente_convocatorias" -> ejecutarAbrirAgente(args, user, response);
                default -> "{\"ok\":false,\"error\":\"Herramienta desconocida\"}";
            };
        } catch (Exception e) {
            log.warn("[CopilotoToolExecutor] Error en tool {}: {}", fnName, e.getMessage());
            String safeErr = e.getMessage() != null ? e.getMessage().replace("\"", "'") : "Error interno";
            return "{\"ok\":false,\"error\":\"" + safeErr + "\"}";
        }
    }

    private String ejecutarConsultarAulas(User user, CopilotoResponse response) throws Exception {
        List<Map<String, Object>> resumenAulas = new ArrayList<>();
        List<OpcionNavegacion> opciones = new ArrayList<>();
        Rol rol = user.getRol();
        String email = user.getEmail();

        if (rol == Rol.JURADO) {
            var grupos = evaluacionJuradoService.misGrupos(email);
            Map<Long, List<EvaluacionJuradoService.GrupoAsignado>> porConv = new LinkedHashMap<>();
            for (var g : grupos) {
                porConv.computeIfAbsent(g.convocatoriaId(), k -> new ArrayList<>()).add(g);
            }
            for (var entry : porConv.entrySet()) {
                long pendientes = entry.getValue().stream().filter(g -> !g.evaluado()).count();
                String titulo = entry.getValue().get(0).convocatoriaTitulo();
                String ruta = "/dashboard/jurado";
                resumenAulas.add(Map.of("titulo", titulo, "pendientes", pendientes, "ruta", ruta));
                opciones.add(new OpcionNavegacion(
                        titulo,
                        "Evaluación de Jurado · " + entry.getValue().size() + " grupos",
                        ruta,
                        pendientes + (pendientes == 1 ? " pendiente" : " pendientes"),
                        "NAVEGAR"
                ));
            }
        } else {
            List<ConvocatoriaDTO> areas = convocatoriaService.listarMisAreas(email);
            for (ConvocatoriaDTO area : areas) {
                List<TareaDTO> tareasArea = tareaService.listarPorConvocatoria(area.getId(), email);
                long pendientes = 0;

                if (rol == Rol.ESTUDIANTE) {
                    pendientes = tareasArea.stream()
                            .filter(t -> t.isHabilitada() && t.getMiEntrega() == null)
                            .count();
                } else {
                    for (TareaDTO t : tareasArea) {
                        try {
                            List<EntregaTareaDTO> entregas = tareaService.listarEntregasPorTarea(t.getId(), email);
                            pendientes += entregas.stream()
                                    .filter(e -> e.getEstado() == EstadoEntrega.ENTREGADO)
                                    .count();
                        } catch (Exception ignored) {}
                    }
                }

                String ruta = "/dashboard/convocatorias/" + area.getId() + "?tab=tareas";
                String badge = rol == Rol.ESTUDIANTE
                        ? pendientes + (pendientes == 1 ? " tarea pendiente" : " tareas pendientes")
                        : pendientes + (pendientes == 1 ? " entrega por calificar" : " entregas por calificar");

                resumenAulas.add(Map.of(
                        "titulo", area.getTitulo(),
                        "tipo", area.getTipo().name(),
                        "estado", area.getEstado().name(),
                        "pendientes", pendientes,
                        "ruta", ruta
                ));
                opciones.add(new OpcionNavegacion(
                        area.getTitulo(),
                        area.getTipo().name() + " · " + tareasArea.size() + " tareas",
                        ruta,
                        badge,
                        "NAVEGAR"
                ));
            }
        }

        if (!opciones.isEmpty()) {
            response.setOpciones(opciones);
            if (!"NAVEGAR".equals(response.getAccion())) {
                response.setAccion("MOSTRAR_OPCIONES");
            }
        }

        long totalPendientes = resumenAulas.stream()
                .mapToLong(a -> a.get("pendientes") instanceof Number n ? n.longValue() : 0L)
                .sum();

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "rol", rol.name(),
                "totalAulas", resumenAulas.size(),
                "totalPendientes", totalPendientes,
                "aulas", resumenAulas
        ));
    }

    private String ejecutarNavegar(JsonNode args, User user, CopilotoResponse response) throws Exception {
        String ruta = args.path("ruta").asText("").trim();
        String error = validarRutaSegunRol(ruta, user);
        if (error != null) {
            return objectMapper.writeValueAsString(Map.of("ok", false, "error", error));
        }
        response.setAccion("NAVEGAR");
        response.setRutaDestino(ruta);
        return objectMapper.writeValueAsString(Map.of("ok", true, "navegandoA", ruta));
    }

    private String ejecutarGestionarTarea(JsonNode args, User user, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            return "{\"ok\":false,\"error\":\"Solo Docentes o Administradores pueden habilitar o editar tareas.\"}";
        }

        String accion = args.path("accion").asText("").trim().toUpperCase(Locale.ROOT);
        String aulaQuery = normalizar(args.path("aulaNombre").asText(""));
        String moduloQuery = normalizar(args.path("moduloNombre").asText(""));
        String tareaQuery = normalizar(args.path("tareaTitulo").asText(""));
        String nuevaFecha = args.path("nuevaFecha").asText("").trim();

        if (tareaQuery.isBlank()) {
            return "{\"ok\":false,\"error\":\"Indica el título aproximado de la tarea.\"}";
        }

        List<ConvocatoriaDTO> areas = convocatoriaService.listarMisAreas(user.getEmail());
        List<TareaMatch> matches = new ArrayList<>();

        for (ConvocatoriaDTO area : areas) {
            if (!aulaQuery.isBlank() && !normalizar(area.getTitulo()).contains(aulaQuery)) {
                continue;
            }
            List<TareaDTO> tareas = tareaService.listarPorConvocatoria(area.getId(), user.getEmail());
            for (TareaDTO t : tareas) {
                boolean matchModulo = moduloQuery.isBlank()
                        || (t.getModuloTitulo() != null && normalizar(t.getModuloTitulo()).contains(moduloQuery));
                boolean matchTarea = normalizar(t.getTitulo()).contains(tareaQuery);
                if (matchModulo && matchTarea) {
                    matches.add(new TareaMatch(area, t));
                }
            }
        }

        if (matches.isEmpty()) {
            return objectMapper.writeValueAsString(Map.of(
                    "ok", false,
                    "error", "No encontré ninguna tarea que coincida con '" + args.path("tareaTitulo").asText("") + "'."
            ));
        }

        if (matches.size() > 1) {
            List<OpcionNavegacion> opciones = new ArrayList<>();
            for (TareaMatch m : matches) {
                opciones.add(new OpcionNavegacion(
                        m.tarea.getTitulo(),
                        m.area.getTitulo() + (m.tarea.getModuloTitulo() != null ? " · " + m.tarea.getModuloTitulo() : ""),
                        "/dashboard/convocatorias/" + m.area.getId() + "?tab=tareas",
                        m.tarea.isHabilitada() ? "Habilitada" : "Deshabilitada",
                        "NAVEGAR"
                ));
            }
            response.setOpciones(opciones);
            response.setAccion("MOSTRAR_OPCIONES");
            return objectMapper.writeValueAsString(Map.of(
                    "ok", false,
                    "error", "Encontré " + matches.size() + " tareas coincidentes. Pide al usuario que indique de cuál aula/módulo desea modificarla."
            ));
        }

        TareaMatch unico = matches.get(0);
        String tipoConfirmacion = switch (accion) {
            case "HABILITAR" -> "HABILITAR_TAREA";
            case "DESHABILITAR" -> "DESHABILITAR_TAREA";
            case "EDITAR_FECHA" -> "EDITAR_FECHA_TAREA";
            default -> throw new IllegalArgumentException("Acción no soportada: " + accion);
        };

        String detalle = unico.area.getTitulo()
                + (unico.tarea.getModuloTitulo() != null ? " · " + unico.tarea.getModuloTitulo() : "")
                + ("EDITAR_FECHA".equals(accion) ? " · Nueva fecha: " + nuevaFecha : "");

        String tituloConfirm = switch (accion) {
            case "HABILITAR" -> "Habilitar \"" + unico.tarea.getTitulo() + "\"";
            case "DESHABILITAR" -> "Deshabilitar \"" + unico.tarea.getTitulo() + "\"";
            default -> "Cambiar fecha de \"" + unico.tarea.getTitulo() + "\"";
        };

        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(new ConfirmacionPendiente(
                tipoConfirmacion,
                tituloConfirm,
                detalle,
                unico.tarea.getId(),
                "EDITAR_FECHA".equals(accion) ? nuevaFecha : null,
                "HABILITAR".equals(accion)
        ));

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "requiereConfirmacion", true,
                "tarea", unico.tarea.getTitulo(),
                "aula", unico.area.getTitulo(),
                "estadoActual", unico.tarea.isHabilitada() ? "Habilitada" : "Deshabilitada"
        ));
    }

    private String ejecutarGestionarConvocatoria(JsonNode args, User user, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            return "{\"ok\":false,\"error\":\"Solo Docentes o Administradores pueden cambiar el estado de convocatorias.\"}";
        }

        String tituloQuery = normalizar(args.path("titulo").asText(""));
        String nuevoEstado = args.path("nuevoEstado").asText("").trim().toUpperCase(Locale.ROOT);
        if (tituloQuery.isBlank()) {
            return "{\"ok\":false,\"error\":\"Indica el título de la convocatoria.\"}";
        }
        if ("ARCHIVADA".equals(nuevoEstado) && user.getRol() != Rol.ADMIN) {
            return "{\"ok\":false,\"error\":\"Solo un Administrador puede archivar convocatorias.\"}";
        }

        List<ConvocatoriaDTO> areas = convocatoriaService.listarMisAreas(user.getEmail());
        List<ConvocatoriaDTO> matches = areas.stream()
                .filter(a -> normalizar(a.getTitulo()).contains(tituloQuery))
                .toList();

        if (matches.isEmpty()) {
            return "{\"ok\":false,\"error\":\"No encontré ninguna convocatoria con ese nombre.\"}";
        }
        if (matches.size() > 1) {
            List<OpcionNavegacion> opciones = matches.stream()
                    .map(a -> new OpcionNavegacion(a.getTitulo(), a.getTipo().name(), "/dashboard/convocatorias/" + a.getId(), a.getEstado().name(), "NAVEGAR"))
                    .toList();
            response.setOpciones(opciones);
            response.setAccion("MOSTRAR_OPCIONES");
            return "{\"ok\":false,\"error\":\"Encontré varias convocatorias con ese nombre. Pide al usuario especificar cuál.\"}";
        }

        ConvocatoriaDTO c = matches.get(0);
        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(new ConfirmacionPendiente(
                "CAMBIAR_ESTADO_CONVOCATORIA",
                "Cambiar estado de \"" + c.getTitulo() + "\" a " + nuevoEstado,
                "Estado actual: " + c.getEstado().name() + " -> " + nuevoEstado,
                c.getId(),
                nuevoEstado,
                null
        ));

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "requiereConfirmacion", true,
                "convocatoria", c.getTitulo(),
                "estadoActual", c.getEstado().name(),
                "estadoDestino", nuevoEstado
        ));
    }

    private String ejecutarGenerarReportePdf(JsonNode args, User user, CopilotoResponse response) throws Exception {
        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            return "{\"ok\":false,\"error\":\"Solo Docentes o Administradores pueden generar reportes.\"}";
        }

        String consulta = args.path("consultaNatural").asText("").trim();
        if (consulta.isBlank()) {
            return "{\"ok\":false,\"error\":\"Describe qué información deseas en el reporte.\"}";
        }

        ConsultaRequest req = new ConsultaRequest();
        req.setPrompt(consulta);
        ConsultaResponse rep = reporteGenerativoService.generarReporte(req);

        if (!rep.isExito()) {
            return objectMapper.writeValueAsString(Map.of(
                    "ok", false,
                    "error", rep.getError() != null ? rep.getError() : "No se pudo generar el reporte."
            ));
        }

        String titulo = rep.getTitulo() != null ? rep.getTitulo() : "Reporte FICCT";
        byte[] pdfBytes = construirPdfTabla(titulo, rep.getColumnas(), rep.getFilas());
        String base64 = Base64.getEncoder().encodeToString(pdfBytes);
        String filename = titulo.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_") + ".pdf";
        String rutaReportes = "/dashboard/reportes?q=" + URLEncoder.encode(consulta, StandardCharsets.UTF_8);

        int totalFilas = rep.getFilas() != null ? rep.getFilas().size() : 0;
        int totalCols = rep.getColumnas() != null ? rep.getColumnas().size() : 0;

        response.setAccion("REPORTE_PDF");
        response.setReporteGenerado(new ReporteGeneradoDTO(
                titulo,
                totalFilas + " registros · " + totalCols + " columnas",
                filename,
                base64,
                rutaReportes
        ));

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "titulo", titulo,
                "totalFilas", totalFilas,
                "columnas", rep.getColumnas() != null ? rep.getColumnas() : List.of()
        ));
    }

    private String ejecutarAbrirAgente(JsonNode args, User user, CopilotoResponse response) {
        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            return "{\"ok\":false,\"error\":\"Solo Docentes y Administradores pueden crear convocatorias con el Agente IA.\"}";
        }
        String prompt = args.path("promptInicial").asText("").trim();
        response.setAccion("ABRIR_AGENTE_CONVOCATORIA");
        response.setMensajeInicialAgente(prompt);
        return "{\"ok\":true,\"mensaje\":\"Transfiriendo al Agente IA de Convocatorias\"}";
    }

    private byte[] construirPdfTabla(String titulo, List<String> columnas, List<Map<String, Object>> filas) throws Exception {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            PDPage page = new PDPage(PDRectangle.LETTER);
            doc.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(doc, page);

            float margin = 40;
            float y = page.getMediaBox().getHeight() - margin;
            float tableWidth = page.getMediaBox().getWidth() - (margin * 2);

            cs.beginText();
            cs.setFont(fontBold, 14);
            cs.newLineAtOffset(margin, y);
            cs.showText(limpiarTextoPdf(titulo));
            cs.endText();
            y -= 18;

            cs.beginText();
            cs.setFont(fontRegular, 9);
            cs.newLineAtOffset(margin, y);
            cs.showText("FICCT - UAGRM · Total de registros: " + (filas != null ? filas.size() : 0));
            cs.endText();
            y -= 22;

            List<String> cols = (columnas != null && !columnas.isEmpty()) ? columnas : List.of("Sin datos");
            int maxCols = Math.min(cols.size(), 6);
            float colWidth = tableWidth / maxCols;

            cs.setFont(fontBold, 8);
            for (int c = 0; c < maxCols; c++) {
                cs.beginText();
                cs.newLineAtOffset(margin + (c * colWidth), y);
                cs.showText(truncar(limpiarTextoPdf(cols.get(c)), 22));
                cs.endText();
            }
            y -= 14;

            cs.setFont(fontRegular, 8);
            if (filas != null) {
                int limit = Math.min(filas.size(), 250);
                for (int r = 0; r < limit; r++) {
                    if (y < margin + 20) {
                        cs.close();
                        page = new PDPage(PDRectangle.LETTER);
                        doc.addPage(page);
                        cs = new PDPageContentStream(doc, page);
                        y = page.getMediaBox().getHeight() - margin;
                        cs.setFont(fontRegular, 8);
                    }
                    Map<String, Object> row = filas.get(r);
                    for (int c = 0; c < maxCols; c++) {
                        Object val = row.get(cols.get(c));
                        String txt = val != null ? limpiarTextoPdf(String.valueOf(val)) : "-";
                        cs.beginText();
                        cs.newLineAtOffset(margin + (c * colWidth), y);
                        cs.showText(truncar(txt, 24));
                        cs.endText();
                    }
                    y -= 13;
                }
            }

            cs.close();
            doc.save(out);
            return out.toByteArray();
        }
    }

    private String limpiarTextoPdf(String s) {
        if (s == null) return "";
        String norm = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return norm.replaceAll("[^\\x20-\\x7E]", " ").trim();
    }

    private String truncar(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 2) + "..";
    }

    private String normalizar(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private String validarRutaSegunRol(String ruta, User user) {
        if (ruta.isBlank() || !ruta.startsWith("/dashboard")) {
            return "Ruta inválida.";
        }
        Rol rol = user.getRol();
        if (ruta.startsWith("/dashboard/usuarios") && rol != Rol.ADMIN) {
            return "No tienes permisos para acceder a Gestión de Usuarios (solo Administradores).";
        }
        if ((ruta.startsWith("/dashboard/reportes") || ruta.startsWith("/dashboard/plantillas") || ruta.startsWith("/dashboard/convocatorias/nueva"))
                && rol != Rol.ADMIN && rol != Rol.DOCENTE) {
            return "No tienes permisos para acceder a esa sección (exclusiva para Docentes y Administradores).";
        }
        if (ruta.startsWith("/dashboard/jurado") && rol != Rol.JURADO && rol != Rol.ADMIN) {
            return "Esa sección es exclusiva para Jurados evaluadores.";
        }
        if (ruta.startsWith("/dashboard/mis-pendientes") && rol != Rol.ESTUDIANTE) {
            return "Mis Pendientes es vista de estudiante; usa consultar_mis_aulas_y_pendientes para ver tus aulas.";
        }
        return null;
    }

    private record TareaMatch(ConvocatoriaDTO area, TareaDTO tarea) {}
}
