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
