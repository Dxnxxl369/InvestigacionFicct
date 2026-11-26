package com.ficct.investigacion.ai.tools;

import com.ficct.investigacion.model.Rol;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class CopilotoToolRegistry {

    public List<Map<String, Object>> obtenerToolsPorRamaYRol(String rama, Rol rol) {
        if ("CHARLA".equals(rama)) {
            return List.of();
        }

        Set<String> permitidasPorRol = switch (rol) {
            case ESTUDIANTE -> Set.of(
                    "consultar_mis_aulas_y_pendientes", "gestionar_grupos",
                    "buscar_biblioteca", "gestionar_notificaciones", "navegar_a"
            );
            case JURADO -> Set.of(
                    "consultar_mis_aulas_y_pendientes", "jurados_y_resumen_pdf",
                    "buscar_biblioteca", "gestionar_notificaciones", "navegar_a"
            );
            case DOCENTE -> Set.of(
                    "consultar_mis_aulas_y_pendientes", "navegar_a",
                    "gestionar_tarea_modulo", "gestionar_convocatoria",
                    "gestionar_grupos", "gestionar_inscripciones",
                    "seguimiento_y_notas", "jurados_y_resumen_pdf",
                    "buscar_biblioteca", "gestionar_notificaciones",
                    "generar_reporte_pdf", "abrir_agente_convocatorias"
            );
            case ADMIN -> Set.of(
                    "consultar_mis_aulas_y_pendientes", "navegar_a",
                    "gestionar_tarea_modulo", "gestionar_convocatoria",
                    "gestionar_plantilla_tarea", "gestionar_grupos",
                    "gestionar_inscripciones", "seguimiento_y_notas",
                    "jurados_y_resumen_pdf", "gestionar_usuarios_admin",
                    "buscar_biblioteca", "gestionar_notificaciones",
                    "generar_reporte_pdf", "abrir_agente_convocatorias"
            );
        };

        Set<String> ramaTools = switch (rama) {
            case "AULAS_TAREAS" -> Set.of("consultar_mis_aulas_y_pendientes", "gestionar_tarea_modulo", "seguimiento_y_notas", "navegar_a");
            case "CONVOCATORIAS" -> Set.of("gestionar_convocatoria", "gestionar_plantilla_tarea", "abrir_agente_convocatorias", "navegar_a");
            case "GRUPOS_INSCRIPCIONES" -> Set.of("gestionar_grupos", "gestionar_inscripciones", "navegar_a");
            case "JURADOS_REPORTES" -> Set.of("jurados_y_resumen_pdf", "generar_reporte_pdf", "seguimiento_y_notas", "consultar_mis_aulas_y_pendientes", "navegar_a");
            default -> Set.of("buscar_biblioteca", "gestionar_notificaciones", "gestionar_usuarios_admin", "navegar_a");
        };

        return obtenerDefinicionTools().stream()
                .filter(t -> {
                    Object fnObj = t.get("function");
                    if (!(fnObj instanceof Map<?, ?> fnMap)) return false;
                    String name = String.valueOf(fnMap.get("name"));
                    return permitidasPorRol.contains(name) && ramaTools.contains(name);
                })
                .toList();
    }

    public List<Map<String, Object>> obtenerDefinicionTools() {
        return List.of(
                tool("consultar_mis_aulas_y_pendientes",
                        "Obtiene las aulas/convocatorias del usuario autenticado con la cantidad exacta de tareas pendientes o entregas por calificar según su rol.",
                        List.of(),
                        Map.of()),

                tool("navegar_a",
                        "Navega inmediatamente a una sección del dashboard autorizada para el rol del usuario.",
                        List.of("destino"),
                        Map.of(
                                "destino", Map.of(
                                        "type", "string",
                                        "enum", List.of("REPORTES", "CONVOCATORIAS", "AULAS", "PLANTILLAS", "USUARIOS", "BIBLIOTECA", "PERFIL", "JURADO", "MIS_PENDIENTES")
                                )
                        )),

                tool("gestionar_tarea_modulo",
                        "Busca una tarea o todas las tareas (en lote) dentro de los módulos/aulas y prepara una tarjeta de confirmación editable para habilitarlas, cerrarlas/deshabilitarlas o configurar sus 3 fechas.",
                        List.of("accion"),
                        Map.of(
                                "accion", Map.of("type", "string", "enum", List.of("HABILITAR", "DESHABILITAR", "EDITAR_FECHAS")),
                                "aplicarATodas", Map.of("type", "boolean"),
                                "tipoConvocatoria", Map.of("type", "string", "enum", List.of("FERIA", "HACKATHON", "CONCURSO", "INVESTIGACION", "TODAS")),
                                "tareaTitulo", Map.of("type", "string"),
                                "moduloNombre", Map.of("type", "string"),
                                "aulaNombre", Map.of("type", "string"),
                                "fechaHabilitacion", Map.of("type", "string"),
                                "fechaEntrega", Map.of("type", "string"),
                                "fechaCorte", Map.of("type", "string")
                        )),

                tool("gestionar_convocatoria",
                        "Busca una o varias convocatorias (individual o en lote, ej. todas las FERIAS en borrador) y prepara una tarjeta de confirmación para cambiarles el estado.",
                        List.of("nuevoEstado"),
                        Map.of(
                                "nuevoEstado", Map.of("type", "string", "enum", List.of("BORRADOR", "PUBLICADA", "FINALIZADA", "ARCHIVADA")),
                                "tipoConvocatoria", Map.of("type", "string", "enum", List.of("FERIA", "HACKATHON", "CONCURSO", "INVESTIGACION", "TODAS")),
                                "estadoActual", Map.of("type", "string", "enum", List.of("BORRADOR", "PUBLICADA", "FINALIZADA")),
                                "titulo", Map.of("type", "string")
                        )),

                tool("gestionar_plantilla_tarea",
                        "Prepara la edición de fechas o habilitación de una actividad dentro de una plantilla global (solo ADMIN).",
                        List.of("actividadTitulo"),
                        Map.of(
                                "plantillaNombre", Map.of("type", "string"),
                                "actividadTitulo", Map.of("type", "string"),
                                "habilitada", Map.of("type", "boolean"),
                                "fechaHabilitacion", Map.of("type", "string"),
                                "fechaEntrega", Map.of("type", "string"),
                                "fechaCorte", Map.of("type", "string")
                        )),

                tool("gestionar_grupos",
                        "Consulta los grupos/equipos de una actividad (mi grupo, cupos disponibles, estudiantes sin grupo) o prepara la generación en lote de grupos (solo ADMIN/DOCENTE).",
                        List.of("accion"),
                        Map.of(
                                "accion", Map.of("type", "string", "enum", List.of("VER_GRUPOS", "ESTUDIANTES_SIN_GRUPO", "GENERAR_LOTE")),
                                "aulaNombre", Map.of("type", "string"),
                                "cantidad", Map.of("type", "integer"),
                                "cupoMaximo", Map.of("type", "integer")
                        )),

                tool("gestionar_inscripciones",
                        "Lista inscripciones pendientes de aprobar en una convocatoria y prepara tarjeta con checkboxes para aceptar o rechazar en lote (solo ADMIN/DOCENTE).",
                        List.of("accion"),
                        Map.of(
                                "accion", Map.of("type", "string", "enum", List.of("LISTAR_PENDIENTES", "APROBAR_PENDIENTES", "RECHAZAR_PENDIENTES")),
                                "aulaNombre", Map.of("type", "string")
                        )),

                tool("seguimiento_y_notas",
                        "Consulta qué estudiantes/grupos faltan por entregar una tarea o exporta la planilla de notas en CSV/Excel (solo lectura/exportación, nunca califica).",
                        List.of("accion"),
                        Map.of(
                                "accion", Map.of("type", "string", "enum", List.of("QUIEN_FALTA", "EXPORTAR_NOTAS")),
                                "aulaNombre", Map.of("type", "string"),
                                "tareaTitulo", Map.of("type", "string")
                        )),

                tool("jurados_y_resumen_pdf",
                        "Consulta estado de jurados/evaluaciones o extrae texto de una entrega PDF para resumirla al jurado/docente SIN calificar ni sugerir nota.",
                        List.of("accion"),
                        Map.of(
                                "accion", Map.of("type", "string", "enum", List.of("ESTADO_JURADOS", "RESUMIR_ENTREGA")),
                                "aulaNombre", Map.of("type", "string"),
                                "grupoNombre", Map.of("type", "string")
                        )),

                tool("gestionar_usuarios_admin",
                        "Solo ADMIN: obtiene estadísticas por rol, busca usuarios o prepara tarjeta de confirmación para suspender, reactivar o cambiar rol.",
                        List.of("accion"),
                        Map.of(
                                "accion", Map.of("type", "string", "enum", List.of("ESTADISTICAS", "BUSCAR", "SUSPENDER", "ACTIVAR", "CAMBIAR_ROL")),
                                "usuarioQuery", Map.of("type", "string"),
                                "nuevoRol", Map.of("type", "string", "enum", List.of("ADMIN", "DOCENTE", "JURADO", "ESTUDIANTE"))
                        )),

                tool("buscar_biblioteca",
                        "Busca proyectos y documentos académicos en la Biblioteca de la FICCT.",
                        List.of("consulta"),
                        Map.of(
                                "consulta", Map.of("type", "string"),
                                "area", Map.of("type", "string")
                        )),

                tool("gestionar_notificaciones",
                        "Resume las notificaciones recientes sin leer o las marca todas como leídas.",
                        List.of("accion"),
                        Map.of(
                                "accion", Map.of("type", "string", "enum", List.of("RESUMEN", "MARCAR_LEIDAS"))
                        )),

                tool("generar_reporte_pdf",
                        "Genera un reporte PDF descargable SOLO cuando el usuario pide explícitamente un reporte, tabla o PDF (ADMIN/DOCENTE). NO usar para preguntas informativas simples.",
                        List.of("consultaNatural"),
                        Map.of(
                                "consultaNatural", Map.of("type", "string")
                        )),

                tool("abrir_agente_convocatorias",
                        "Transfiere al usuario al Agente IA especializado para crear o redactar una nueva convocatoria, feria, hackathon, concurso o investigación (solo ADMIN o DOCENTE).",
                        List.of(),
                        Map.of(
                                "promptInicial", Map.of("type", "string")
                        ))
        );
    }

    private Map<String, Object> tool(String name, String description, List<String> required, Map<String, Object> properties) {
        return Map.of(
                "type", "function",
                "function", Map.of(
                        "name", name,
                        "description", description,
                        "parameters", Map.of(
                                "type", "object",
                                "required", required,
                                "properties", properties
                        )
                )
        );
    }
}
