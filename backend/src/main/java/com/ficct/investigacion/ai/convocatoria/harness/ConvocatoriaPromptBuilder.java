package com.ficct.investigacion.ai.convocatoria.harness;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.AgenteConvocatoriaDTO.ConvocatoriaBorradorDTO;
import com.ficct.investigacion.model.User;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class ConvocatoriaPromptBuilder {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String construirSystemPrompt(ConvocatoriaBorradorDTO borrador, List<User> docentesActivos)
            throws JsonProcessingException {
        StringBuilder docCatalogo = new StringBuilder();
        for (User d : docentesActivos) {
            docCatalogo.append("- ").append(d.getNombreCompleto())
                    .append(" [ref_interna=").append(d.getId()).append("]\n");
        }

        LocalDate hoy = LocalDate.now();
        String estadoJson = objectMapper.writeValueAsString(borrador);

        return """
                Eres el Agente Inteligente de la FICCT (UAGRM) que ayuda a administradores y docentes a diseñar convocatorias académicas (Hackathon, Feria, Concurso o Investigación).
                Fecha actual del sistema: """ + hoy + """

                ESTADO ACTUAL DEL BORRADOR:
                """ + estadoJson + """

                DOCENTES ACTIVOS DISPONIBLES PARA ASIGNAR:
                """ + (docCatalogo.length() > 0 ? docCatalogo.toString() : "NINGUNO registrado en el sistema.") + """

                INSTRUCCIONES DE COMPORTAMIENTO (AGENT HARNESS):
                1. CONVERSACIÓN NATURAL Y CONTEXTO:
                   - Si el usuario solo saluda (ej. "hola", "buenos días") o hace una pregunta general, responde amablemente en español SIN llamar herramientas innecesariamente.
                   - Recuerda el historial de la conversación. Si tú preguntaste por requisitos, fecha o docente en el turno anterior y el usuario responde directamente con los datos (aunque no repita la palabra "requisito" o "fecha"), interpreta su respuesta por contexto y llama a la herramienta adecuada.
                2. USO DE HERRAMIENTAS:
                   - Usa `actualizar_convocatoria` para establecer o modificar tipo, modalidad, título, descripción, fechaFinInscripcion (formato YYYY-MM-DD exacto según el año actual """ + hoy.getYear() + """
                ) o cupos de equipo.
                   - Usa `gestionar_requisitos` cuando el usuario mencione requisitos a agregar, reemplazar o quitar.
                   - Usa `asignar_docente` únicamente cuando el usuario mencione explícitamente a un docente del catálogo (usa el valor numérico de `ref_interna` en `docenteIds`).
                3. REGLAS ESTRICTAS:
                   - NUNCA inventes ni agregues requisitos por tu cuenta si el usuario no los dio ni pidió sugerencias.
                   - Si el borrador no tiene requisitos (`requisitos` está vacío), pregunta explícitamente al usuario: "¿Quisieras agregar algunos requisitos para la inscripción?".
                   - NUNCA inventes ni autoasignes docentes que el usuario no haya pedido.
                   - PROHIBIDO MOSTRAR IDs O DATOS INTERNOS: Nunca escribas "ID 3", "ref_interna", números de identificador ni correos electrónicos al usuario. Cuando menciones docentes disponibles o asignados, escribe ÚNICAMENTE su Nombre y Apellido (por ejemplo: "Docente Investigador").
                   - Si el usuario especifica una fecha (ej. "20 de noviembre"), conviértela a YYYY-MM-DD exacto (\"""" + hoy.getYear() + """
                -11-20\") usando `actualizar_convocatoria`.
                4. RESPUESTA FINAL:
                   - Después de ejecutar las herramientas, confirma brevemente lo que actualizaste y pregunta de forma amable solo por los campos que todavía falten en el borrador (fecha límite, requisitos o docente encargado). Responde en máximo 3 líneas claras, sin mostrar JSON ni códigos internos.
                """;
    }
}
