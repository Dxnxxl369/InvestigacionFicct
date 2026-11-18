package com.ficct.investigacion.ai.tools;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class CopilotoToolRegistry {

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
                                "aplicarATodas", Map.of("type", "boolean", "description", "true si pide abrir, cerrar o editar todas las tareas (de un aula, módulo, tipo o en general)"),
                                "tipoConvocatoria", Map.of("type", "string", "enum", List.of("FERIA", "HACKATHON", "CONCURSO", "INVESTIGACION", "TODAS")),
                                "tareaTitulo", Map.of("type", "string", "description", "Título de la tarea si se refiere a una específica; omitir si es en lote"),
                                "moduloNombre", Map.of("type", "string", "description", "Nombre o número del módulo si fue mencionado"),
                                "aulaNombre", Map.of("type", "string", "description", "Nombre de la feria, hackathon, concurso o aula si fue mencionado"),
                                "fechaHabilitacion", Map.of("type", "string", "description", "Fecha de apertura opcional (YYYY-MM-DD o YYYY-MM-DDTHH:mm)"),
                                "fechaEntrega", Map.of("type", "string", "description", "Fecha límite de entrega opcional (YYYY-MM-DD o YYYY-MM-DDTHH:mm)"),
                                "fechaCorte", Map.of("type", "string", "description", "Fecha de cierre/corte opcional (YYYY-MM-DD o YYYY-MM-DDTHH:mm)")
                        )),

                tool("gestionar_convocatoria",
                        "Busca una o varias convocatorias (individual o en lote, ej. todas las FERIAS en borrador) y prepara una tarjeta de confirmación para cambiarles el estado.",
                        List.of("nuevoEstado"),
                        Map.of(
                                "nuevoEstado", Map.of("type", "string", "enum", List.of("BORRADOR", "PUBLICADA", "FINALIZADA", "ARCHIVADA")),
                                "tipoConvocatoria", Map.of("type", "string", "enum", List.of("FERIA", "HACKATHON", "CONCURSO", "INVESTIGACION", "TODAS"), "description", "Filtro por tipo si pide varias o todas de un tipo"),
                                "estadoActual", Map.of("type", "string", "enum", List.of("BORRADOR", "PUBLICADA", "FINALIZADA"), "description", "Filtro opcional por estado actual"),
                                "titulo", Map.of("type", "string", "description", "Título o parte del título si se refiere a una específica")
                        )),

                tool("gestionar_plantilla_tarea",
                        "Prepara la edición de fechas o habilitación de una actividad dentro de una plantilla global (solo ADMIN).",
                        List.of("actividadTitulo"),
                        Map.of(
                                "plantillaNombre", Map.of("type", "string", "description", "Nombre de la plantilla si fue mencionado"),
                                "actividadTitulo", Map.of("type", "string", "description", "Título de la actividad/tarea dentro de la plantilla"),
                                "habilitada", Map.of("type", "boolean"),
                                "fechaHabilitacion", Map.of("type", "string", "description", "YYYY-MM-DD o YYYY-MM-DDTHH:mm"),
                                "fechaEntrega", Map.of("type", "string", "description", "YYYY-MM-DD o YYYY-MM-DDTHH:mm"),
                                "fechaCorte", Map.of("type", "string", "description", "YYYY-MM-DD o YYYY-MM-DDTHH:mm")
                        )),

                tool("generar_reporte_pdf",
                        "Ejecuta una consulta de reporte institucional en lenguaje natural y genera un documento PDF descargable directamente desde el chat (solo ADMIN o DOCENTE).",
                        List.of("consultaNatural"),
                        Map.of(
                                "consultaNatural", Map.of("type", "string", "description", "Descripción exacta del reporte solicitado por el usuario")
                        )),

                tool("abrir_agente_convocatorias",
                        "Transfiere al usuario al Agente IA especializado para crear o redactar una nueva convocatoria, feria, hackathon, concurso o investigación (solo ADMIN o DOCENTE).",
                        List.of(),
                        Map.of(
                                "promptInicial", Map.of("type", "string", "description", "Descripción o instrucción inicial si el usuario dio detalles")
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
