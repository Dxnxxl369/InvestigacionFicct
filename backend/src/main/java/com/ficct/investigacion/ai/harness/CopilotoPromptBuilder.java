package com.ficct.investigacion.ai.harness;

import com.ficct.investigacion.model.User;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class CopilotoPromptBuilder {

    private final CopilotoContextResolver contextResolver;

    public CopilotoPromptBuilder(CopilotoContextResolver contextResolver) {
        this.contextResolver = contextResolver;
    }

    public String construirPromptClasificador(User user, String rutaActual) {
        String contextoPantalla = contextResolver.describirContextoRuta(rutaActual, user);
        return """
                Clasifica la intención del usuario en UNA sola palabra exacta:
                - AULAS_TAREAS: pendientes, aulas, tareas, módulos, fechas de entrega, quién falta entregar.
                - PLANTILLAS: plantillas globales, primer avance, segundo avance, presentación final, habilitar plantilla en ferias/hackathones.
                - CONVOCATORIAS: ferias, hackathones, concursos, publicar/archivar convocatorias, crear convocatoria.
                - GRUPOS_INSCRIPCIONES: grupos, equipos, inscripciones pendientes, aprobar/rechazar postulantes.
                - JURADOS_REPORTES: jurados, evaluaciones, resumir PDF entregado, generar reporte PDF, exportar notas.
                - BIBLIOTECA_USUARIOS_CHARLA: biblioteca, buscar proyectos, notificaciones, usuarios/roles, navegar a una vista.
                - CHARLA: saludo, agradecimiento o pregunta general sin acción en base de datos.
                Rol: %s | Ubicación: %s
                Responde SOLO con el nombre de la categoría.
                """.formatted(user.getRol().name(), contextoPantalla);
    }

    public String construirSystemPromptPorRama(User user, String rutaActual, String rama) {
        String contextoPantalla = contextResolver.describirContextoRuta(rutaActual, user);
        String guiaRama = switch (rama) {
            case "AULAS_TAREAS" -> "- Pendientes/aulas -> `consultar_mis_aulas_y_pendientes`.\n- Habilitar/cerrar/fechas tareas -> `gestionar_tarea_modulo`.\n- Quién falta entregar o exportar notas -> `seguimiento_y_notas`.\n- Ir a vista -> `navegar_a`.";
            case "PLANTILLAS" -> "- Consultar/contar plantillas, sus tareas o qué plantillas tiene asignadas en orden una categoría (Feria/Hackathon/etc.) -> `consultar_plantillas`.\n- Al responder sobre `consultar_plantillas`, respeta fielmente el `orden` (1, 2...), `asignadasEnOrden` vs `noAsignadas`, y NO mezcles tareas de una plantilla con otra.\n- Habilitar/deshabilitar plantilla en tipos (Ferias, Hackathones) o en eventos específicos -> `asignar_plantilla_a_eventos`.\n- Crear/renombrar/eliminar plantilla o agregar/quitar tarea -> `gestionar_plantilla_estructura`.\n- Editar fechas/habilitación de una tarea de plantilla -> `gestionar_plantilla_tarea`.\n- Solo navegar si piden ir a la vista -> `navegar_a`.";
            case "CONVOCATORIAS" -> "- Consultar/contar ferias, hackathones, concursos o borradores -> `consultar_convocatorias`.\n- Publicar/archivar/estado convocatorias -> `gestionar_convocatoria`.\n- Consultar plantillas -> `consultar_plantillas`.\n- Crear nueva convocatoria -> `abrir_agente_convocatorias`.\n- Ir a vista -> `navegar_a`.";
            case "GRUPOS_INSCRIPCIONES" -> "- Grupos/equipos o estudiantes sin grupo -> `gestionar_grupos`.\n- Inscripciones pendientes -> `gestionar_inscripciones`.\n- Ir a vista -> `navegar_a`.";
            case "JURADOS_REPORTES" -> "- Jurados, evaluaciones o resumir PDF -> `jurados_y_resumen_pdf`.\n- Reporte PDF (SOLO si pide reporte/PDF) -> `generar_reporte_pdf`.\n- Exportar notas -> `seguimiento_y_notas`.\n- Pendientes -> `consultar_mis_aulas_y_pendientes`.";
            case "CHARLA" -> "- Responde directo en español cordial (máximo 2 líneas).";
            default -> "- Biblioteca -> `buscar_biblioteca`.\n- Notificaciones -> `gestionar_notificaciones`.\n- Usuarios/estadísticas ADMIN -> `gestionar_usuarios_admin`.\n- Ir a vista -> `navegar_a`.";
        };
        return """
                Eres el Copiloto IA de FICCT - UAGRM.
                Fecha: %s | Usuario: %s %s | Rol: %s | Ubicación: %s

                REGLAS:
                - Responde en español cordial y directo (máximo 2-3 líneas).
                - PROHIBIDO mencionar rutas "/dashboard...", IDs, SQL, tablas Markdown inventadas con "[campo]" ni sugerir notas numéricas.
                - Usa SOLO las herramientas disponibles cuando necesites datos reales. NUNCA inventes ni afirmes si existen o no ferias, convocatorias, plantillas o usuarios, ni imites mensajes anteriores como 'Listo, fue habilitada...' sin haber ejecutado primero la herramienta correspondiente. No generes PDF si solo hacen una pregunta simple.
                %s
                """.formatted(
                LocalDate.now(),
                user.getNombre(),
                user.getApellido() != null ? user.getApellido() : "",
                user.getRol().name(),
                contextoPantalla,
                guiaRama
        );
    }

    public String construirSystemPrompt(User user, String rutaActual) {
        String contextoPantalla = contextResolver.describirContextoRuta(rutaActual, user);
        return """
                Eres el Copiloto IA de la plataforma FICCT - UAGRM.
                Fecha actual: %s | Usuario: %s %s | Rol: %s | Ubicación: %s

                REGLAS ESTRICTAS:
                - Responde siempre en español natural, cordial, puntual y directo (máximo 2 a 3 líneas).
                - PROHIBIDO mencionar rutas técnicas (como "/dashboard..."), IDs numéricos, SQL o nombres de tablas.
                - PROHIBIDO calificar entregas o sugerir notas numéricas: si te piden resumir una entrega, resume únicamente su contenido y objetivos.
                - Usa SIEMPRE las herramientas disponibles; nunca inventes datos ni digas haber guardado algo si no pasó por confirmación.

                CUÁNDO USAR CADA HERRAMIENTA:
                - Pendientes / aulas -> `consultar_mis_aulas_y_pendientes` (si totalPendientes es 0, responde alegremente que está al día).
                - Ir a una sección -> `navegar_a` con el destino lógico.
                - Habilitar, cerrar o cambiar fechas de tareas (1 o todas) -> `gestionar_tarea_modulo`.
                - Publicar, archivar o pasar a borrador convocatorias (1 o en lote) -> `gestionar_convocatoria`.
                - Editar fechas de plantilla global -> `gestionar_plantilla_tarea`.
                - Grupos/equipos o estudiantes sin grupo -> `gestionar_grupos`.
                - Inscripciones pendientes (listar/aprobar/rechazar) -> `gestionar_inscripciones`.
                - Quién falta entregar o exportar notas -> `seguimiento_y_notas`.
                - Jurados, evaluaciones o resumir PDF entregado -> `jurados_y_resumen_pdf`.
                - Estadísticas o gestión de usuarios (solo ADMIN) -> `gestionar_usuarios_admin`.
                - Buscar proyectos en Biblioteca -> `buscar_biblioteca`.
                - Notificaciones -> `gestionar_notificaciones`.
                - Reporte PDF en el chat -> `generar_reporte_pdf`.
                - Crear nueva convocatoria -> `abrir_agente_convocatorias`.
                """.formatted(
                LocalDate.now(),
                user.getNombre(),
                user.getApellido() != null ? user.getApellido() : "",
                user.getRol().name(),
                contextoPantalla
        );
    }
}
