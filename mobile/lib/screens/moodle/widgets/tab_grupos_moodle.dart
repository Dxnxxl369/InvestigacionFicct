import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/actividad_grupo_model.dart';
import 'moodle_ui_helpers.dart';

class TabGruposMoodle extends StatelessWidget {
  final bool isLoadingGrupos;
  final List<ActividadGrupoModel> actividadesGrupo;
  final List<GrupoModel> gruposArea;
  final Map<String, dynamic>? metricasGrupos;
  final List<Map<String, dynamic>> participantes;
  final bool isDark;
  final bool isDocente;
  final bool isJurado;
  final bool isAdmin;
  final int? selectedGrupoIdForStudent;
  final bool guardandoEleccion;
  final Function(int?) onSelectGrupoForStudent;
  final Function(ActividadGrupoModel) onGuardarEleccion;
  final Function(ActividadGrupoModel) onAnularEleccion;
  final Function(int grupoId, int participanteId, String nombreEstudiante) onRemoverMiembro;
  final VoidCallback onShowCrearGrupo;
  final VoidCallback onShowGenerarLote;
  final Function({ActividadGrupoModel? actividadExistente}) onShowCrearOEditarActividad;

  const TabGruposMoodle({
    super.key,
    required this.isLoadingGrupos,
    required this.actividadesGrupo,
    required this.gruposArea,
    required this.metricasGrupos,
    required this.participantes,
    required this.isDark,
    required this.isDocente,
    required this.isJurado,
    required this.isAdmin,
    required this.selectedGrupoIdForStudent,
    required this.guardandoEleccion,
    required this.onSelectGrupoForStudent,
    required this.onGuardarEleccion,
    required this.onAnularEleccion,
    required this.onRemoverMiembro,
    required this.onShowCrearGrupo,
    required this.onShowGenerarLote,
    required this.onShowCrearOEditarActividad,
  });

  @override
  Widget build(BuildContext context) {
    final isDocenteOAdmin = isDocente || isAdmin;

    if (isLoadingGrupos) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(color: AppTheme.accent),
        ),
      );
    }

    final act = actividadesGrupo.isNotEmpty ? actividadesGrupo.first : null;
    final grupos = act != null && act.grupos.isNotEmpty ? act.grupos : gruposArea;

    // Métricas
    final totalGrupos = grupos.length;
    final totalEstudiantes = metricasGrupos?['totalEstudiantesArea'] ?? participantes.length;
    final conEquipo = metricasGrupos?['totalConEquipoArea'] ?? 0;
    final sinEquipo = metricasGrupos?['totalSinEquipoArea'] ??
        (totalEstudiantes > conEquipo ? totalEstudiantes - conEquipo : 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Tarjetas de Métricas de Grupos (4 en fila)
        Row(
          children: [
            MoodleUIHelpers.buildMetricCard('Total Grupos', '$totalGrupos', AppTheme.ink, isDark),
            const SizedBox(width: 8),
            MoodleUIHelpers.buildMetricCard('En Aula', '$totalEstudiantes', Colors.blue, isDark),
            const SizedBox(width: 8),
            MoodleUIHelpers.buildMetricCard('Con Equipo', '$conEquipo', const Color(0xFF10B981), isDark),
            const SizedBox(width: 8),
            MoodleUIHelpers.buildMetricCard(
                'Sin Equipo', '$sinEquipo', sinEquipo > 0 ? Colors.amber : AppTheme.inkFaint, isDark),
          ],
        ),
        const SizedBox(height: 16),

        if (isDocenteOAdmin || isJurado)
          // ----------------------------------------------------
          // VISTA DOCENTE / JURADO: ORQUESTACIÓN Y MONITOREO DE EQUIPOS
          // ----------------------------------------------------
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isDocenteOAdmin
                                  ? 'Panel Docente: Orquestación de Equipos'
                                  : 'Equipos de Trabajo Registrados',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              isDocenteOAdmin
                                  ? 'Monitorea la conformación de grupos y reasigna estudiantes.'
                                  : 'Consulta la conformación de los grupos y sus integrantes para evaluación.',
                              style: const TextStyle(fontSize: 11, color: AppTheme.inkSoft),
                            ),
                          ],
                        ),
                      ),
                      if (isDocenteOAdmin)
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            if (act != null)
                              ElevatedButton.icon(
                                onPressed: () => onShowCrearOEditarActividad(actividadExistente: act),
                                icon: const Icon(Icons.edit_calendar_rounded, size: 13),
                                label: const Text('Editar Plazos', style: TextStyle(fontSize: 11)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.accent,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                ),
                              )
                            else
                              OutlinedButton.icon(
                                onPressed: () => onShowCrearOEditarActividad(),
                                icon: const Icon(Icons.assignment_ind_outlined, size: 13),
                                label: const Text('Elección', style: TextStyle(fontSize: 11)),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                ),
                              ),
                            OutlinedButton.icon(
                              onPressed: onShowGenerarLote,
                              icon: const Icon(Icons.auto_awesome, size: 13),
                              label: const Text('Lote', style: TextStyle(fontSize: 11)),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: onShowCrearGrupo,
                              icon: const Icon(Icons.add, size: 13),
                              label: const Text('Grupo', style: TextStyle(fontSize: 11)),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  if (act != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: AppTheme.accentSoft,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.how_to_reg_rounded, size: 18, color: AppTheme.accentDark),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      act.titulo,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                    if (act.descripcion.isNotEmpty)
                                      Text(
                                        act.descripcion,
                                        style: TextStyle(
                                            fontSize: 11,
                                            color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                  ],
                                ),
                              ),
                              if (isDocenteOAdmin)
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.accent),
                                  tooltip: 'Editar plazos y parámetros',
                                  onPressed: () => onShowCrearOEditarActividad(actividadExistente: act),
                                ),
                            ],
                          ),
                          const Divider(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today_rounded, size: 13, color: AppTheme.accent),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        'Abre: ${MoodleUIHelpers.formatearFechaCorta(act.fechaApertura)}',
                                        style: TextStyle(
                                            fontSize: 10.5,
                                            color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: Row(
                                  children: [
                                    const Icon(Icons.event_busy_rounded, size: 13, color: Colors.red),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        'Cierra: ${MoodleUIHelpers.formatearFechaCorta(act.fechaCierre)}',
                                        style: TextStyle(
                                            fontSize: 10.5,
                                            color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (act.abierta ? const Color(0xFF10B981) : Colors.red)
                                      .withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  act.abierta ? 'ABIERTA' : 'CERRADA',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                    color: act.abierta ? const Color(0xFF10B981) : Colors.red,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Máx ${act.capacidadPorGrupo} miembros/grupo',
                                style: const TextStyle(fontSize: 10.5, color: AppTheme.inkSoft),
                              ),
                              if (act.permitirCambio) ...[
                                const Text(' • ', style: TextStyle(fontSize: 10.5, color: AppTheme.inkFaint)),
                                const Text('Permite cambio',
                                    style: TextStyle(fontSize: 10.5, color: AppTheme.inkSoft)),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  if (grupos.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: Text(
                          'No hay grupos configurados todavía. Toca "Nuevo Grupo" para iniciar.',
                          style: TextStyle(fontSize: 12, color: AppTheme.inkSoft),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  else
                    ...grupos.map((g) {
                      final maxCap = g.capacidadMaxima;
                      final count = g.cantidadMiembros;
                      final pct = maxCap > 0 ? (count / maxCap).clamp(0.0, 1.0) : 0.0;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  g.nombre,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(width: 8),
                                if (g.completo)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.red.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text('COMPLETO',
                                        style: TextStyle(
                                            fontSize: 9, fontWeight: FontWeight.bold, color: Colors.red)),
                                  ),
                                const Spacer(),
                                Text(
                                  '$count / $maxCap integrantes',
                                  style: const TextStyle(
                                      fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.inkSoft),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: pct,
                                backgroundColor: isDark ? AppTheme.darkLine : AppTheme.line,
                                color: g.completo ? Colors.red : (pct > 0.8 ? Colors.amber : AppTheme.accent),
                                minHeight: 6,
                              ),
                            ),
                            const SizedBox(height: 10),

                            // Lista de Miembros del Grupo
                            if (g.miembros.isEmpty)
                              const Text('Sin estudiantes asignados a este grupo.',
                                  style: TextStyle(
                                      fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.inkFaint))
                            else
                              Column(
                                children: g.miembros.asMap().entries.map((entry) {
                                  final idx = entry.key + 1;
                                  final m = entry.value;
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 3),
                                    child: Row(
                                      children: [
                                        Text('$idx. ',
                                            style: const TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.inkFaint)),
                                        Expanded(
                                          child: Text(
                                            m.nombreCompleto,
                                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        if (isDocenteOAdmin)
                                          IconButton(
                                            icon: const Icon(Icons.person_remove_rounded,
                                                size: 16, color: AppTheme.danger),
                                            tooltip: 'Retirar del grupo',
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(),
                                            onPressed: () =>
                                                onRemoverMiembro(g.id, m.participanteId, m.nombreCompleto),
                                          ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
          )
        else
          // ----------------------------------------------------
          // VISTA ESTUDIANTE: COMBOBOX DE SELECCIÓN DE GRUPO
          // ----------------------------------------------------
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.accent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.how_to_reg_rounded, color: AppTheme.accent, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              act?.titulo ?? 'Elección de Grupo de Trabajo',
                              style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.bold),
                            ),
                            if (act != null && act.fechaCierre != null)
                              Text(
                                'Plazo límite: ${MoodleUIHelpers.formatearFechaCorta(act.fechaCierre)}${act.fechaApertura != null ? ' • Apertura: ${MoodleUIHelpers.formatearFechaCorta(act.fechaApertura)}' : ''}',
                                style: const TextStyle(fontSize: 11, color: AppTheme.inkSoft),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (act?.descripcion != null && act!.descripcion.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        act.descripcion,
                        style: const TextStyle(fontSize: 11.5, color: AppTheme.inkSoft),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),

                  // Banner de Estado Actual del Estudiante
                  if (act != null && act.grupoSeleccionadoNombre != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 22),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Elección Confirmada',
                                    style: TextStyle(
                                        fontSize: 10, color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                                Text(
                                  act.grupoSeleccionadoNombre!,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                          if (act.abierta && act.permitirCambio)
                            TextButton.icon(
                              onPressed: () => onAnularEleccion(act),
                              icon: const Icon(Icons.close_rounded, size: 14, color: AppTheme.danger),
                              label: const Text('Anular', style: TextStyle(fontSize: 11, color: AppTheme.danger)),
                            ),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: Colors.blue, size: 20),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Aún no has seleccionado un grupo. Elige una opción en el menú desplegable y confirma tu elección.',
                              style: TextStyle(fontSize: 11.5, color: Colors.blue),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 18),

                  // COMBOBOX DE SELECCIÓN DE GRUPO
                  const Text(
                    'Seleccionar Grupo en Lista:',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),

                  DropdownButtonFormField<int>(
                    value: selectedGrupoIdForStudent,
                    decoration: InputDecoration(
                      hintText: '-- Selecciona tu grupo --',
                      prefixIcon: const Icon(Icons.groups_outlined),
                      filled: true,
                      fillColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                    ),
                    items: grupos.map((g) {
                      final esMiGrupo = act?.grupoSeleccionadoId == g.id;
                      final estaLleno = g.completo && !esMiGrupo;
                      final label = estaLleno
                          ? '${g.nombre} (${g.cantidadMiembros}/${g.capacidadMaxima} - Completo)'
                          : '${g.nombre} (${g.cantidadMiembros}/${g.capacidadMaxima} plazas)';

                      return DropdownMenuItem<int>(
                        value: g.id,
                        enabled: !estaLleno,
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: estaLleno ? AppTheme.inkFaint : null,
                            fontWeight: esMiGrupo ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: onSelectGrupoForStudent,
                  ),
                  const SizedBox(height: 16),

                  // Botón Guardar Elección
                  ElevatedButton.icon(
                    onPressed: guardandoEleccion ||
                            act == null ||
                            selectedGrupoIdForStudent == null ||
                            act.cerrada
                        ? null
                        : () => onGuardarEleccion(act),
                    icon: guardandoEleccion
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.save_rounded, size: 16),
                    label: Text(
                      guardandoEleccion ? 'Guardando...' : 'Guardar mi elección',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Listado informativo de miembros por grupo
                  const Text(
                    'Distribución de Grupos y Miembros:',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),

                  ...grupos.map((g) {
                    final esMiEleccion = act?.grupoSeleccionadoId == g.id;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: esMiEleccion
                            ? AppTheme.accent.withValues(alpha: 0.1)
                            : (isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: esMiEleccion ? AppTheme.accent : (isDark ? AppTheme.darkLine : AppTheme.line),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(g.nombre, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              if (esMiEleccion) ...[
                                const SizedBox(width: 6),
                                const Text('(Tu Grupo)',
                                    style: TextStyle(
                                        fontSize: 10.5, color: AppTheme.accent, fontWeight: FontWeight.bold)),
                              ],
                              const Spacer(),
                              Text('${g.cantidadMiembros}/${g.capacidadMaxima}',
                                  style: const TextStyle(fontSize: 11, color: AppTheme.inkSoft)),
                            ],
                          ),
                          if (act != null && !act.mostrarMiembros && !isDocenteOAdmin) ...[
                            const SizedBox(height: 4),
                            Text(
                              esMiEleccion
                                  ? '✓ Estás registrado (Lista de integrantes oculta por el docente)'
                                  : 'Lista de integrantes oculta por el docente.',
                              style: const TextStyle(
                                  fontSize: 10.5, fontStyle: FontStyle.italic, color: AppTheme.inkFaint),
                            ),
                          ] else if (g.miembros.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              g.miembros.map((m) => m.nombreCompleto).join(', '),
                              style: const TextStyle(fontSize: 10.5, color: AppTheme.inkSoft),
                            ),
                          ],
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
