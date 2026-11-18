package com.ficct.investigacion.ai.convocatoria.tools;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class ConvocatoriaToolRegistry {

    public List<Map<String, Object>> construirDefinicionTools() {
        Map<String, Object> toolActualizar = Map.of(
                "type", "function",
                "function", Map.of(
                        "name", "actualizar_convocatoria",
                        "description", "Actualiza uno o más campos generales de la convocatoria en borrador. Envía únicamente los campos que el usuario pidió establecer o cambiar.",
                        "parameters", Map.of(
                                "type", "object",
                                "required", List.of(),
                                "properties", Map.of(
                                        "tipo", Map.of("type", "string", "enum", List.of("HACKATHON", "FERIA", "CONCURSO", "INVESTIGACION")),
                                        "modalidadInscripcion", Map.of("type", "string", "enum", List.of("GRUPAL", "INDIVIDUAL")),
                                        "titulo", Map.of("type", "string", "description", "Título formal y claro del evento"),
                                        "descripcion", Map.of("type", "string", "description", "Descripción de objetivos y alcance"),
                                        "fechaFinInscripcion", Map.of("type", "string", "description", "Fecha límite de inscripción en formato YYYY-MM-DD"),
                                        "cuposMinEquipo", Map.of("type", "integer"),
                                        "cuposMaxEquipo", Map.of("type", "integer")
                                )
                        )
                )
        );

        Map<String, Object> toolRequisitos = Map.of(
                "type", "function",
                "function", Map.of(
                        "name", "gestionar_requisitos",
                        "description", "Agrega, reemplaza, elimina o limpia la lista de requisitos de inscripción de la convocatoria.",
                        "parameters", Map.of(
                                "type", "object",
                                "required", List.of("accion"),
                                "properties", Map.of(
                                        "accion", Map.of("type", "string", "enum", List.of("AGREGAR", "REEMPLAZAR", "ELIMINAR", "LIMPIAR")),
                                        "requisitos", Map.of("type", "array", "items", Map.of("type", "string"))
                                )
                        )
                )
        );

        Map<String, Object> toolDocente = Map.of(
                "type", "function",
                "function", Map.of(
                        "name", "asignar_docente",
                        "description", "Asigna uno o varios IDs de docentes encargados del catálogo disponible.",
                        "parameters", Map.of(
                                "type", "object",
                                "required", List.of("docenteIds"),
                                "properties", Map.of(
                                        "docenteIds", Map.of("type", "array", "items", Map.of("type", "integer"))
                                )
                        )
                )
        );

        return List.of(toolActualizar, toolRequisitos, toolDocente);
    }
}
