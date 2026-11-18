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
                        "Busca una tarea dentro de los módulos/aulas del usuario y prepara una tarjeta editable para habilitarla, deshabilitarla o configurar sus 3 fechas (apertura, entrega, corte) antes de confirmar.",
                        List.of("accion", "tareaTitulo"),
                        Map.of(
                                "accion", Map.of("type", "string", "enum", List.of("HABILITAR", "DESHABILITAR", "EDITAR_FECHAS")),
                                "tareaTitulo", Map.of("type", "string", "description", "Título o palabras clave de la tarea (ej. Documentacion, Primer Avance)"),
                                "moduloNombre", Map.of("type", "string", "description", "Nombre o número del módulo si fue mencionado"),
                                "aulaNombre", Map.of("type", "string", "description", "Nombre de la feria, hackathon, concurso o aula si fue mencionado"),
                                "fechaHabilitacion", Map.of("type", "string", "description", "Fecha de apertura opcional (YYYY-MM-DD o YYYY-MM-DDTHH:mm)"),
                                "fechaEntrega", Map.of("type", "string", "description", "Fecha límite de entrega opcional (YYYY-MM-DD o YYYY-MM-DDTHH:mm)"),
                                "fechaCorte", Map.of("type", "string", "description", "Fecha de cierre/corte opcional (YYYY-MM-DD o YYYY-MM-DDTHH:mm)")
                        )),

                tool("gestionar_convocatoria",
                        "Prepara el cambio de estado de una convocatoria existente entre BORRADOR, PUBLICADA, FINALIZADA o ARCHIVADA (solo ADMIN o DOCENTE).",
                        List.of("titulo", "nuevoEstado"),
                        Map.of(
                                "titulo", Map.of("type", "string", "description", "Título o parte del título de la convocatoria"),
                                "nuevoEstado", Map.of("type", "string", "enum", List.of("BORRADOR", "PUBLICADA", "FINALIZADA", "ARCHIVADA"))
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
