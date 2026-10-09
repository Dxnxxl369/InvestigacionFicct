import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/modulo_model.dart';
import 'moodle_ui_helpers.dart';

class TabCalificacionesMoodle extends StatelessWidget {
  final bool isLoadingGradebook;
  final bool isDark;
  final bool isDocente;
  final bool isJurado;
  final bool isAdmin;
  final List<ModuloModel> modulos;
  final List<Map<String, dynamic>> participantes;
  final Map<int, List<Map<String, dynamic>>> entregasGradebook;
  final String searchGradebookQuery;
  final Function(String) onSearchChanged;
  final VoidCallback onExportarCSV;
  final VoidCallback onReloadGradebook;
  final Function(int tareaId) onOpenSpeedGrader;

  const TabCalificacionesMoodle({
    super.key,
    required this.isLoadingGradebook,
    required this.isDark,
    required this.isDocente,
    required this.isJurado,
    required this.isAdmin,
    required this.modulos,
    required this.participantes,
    required this.entregasGradebook,
    required this.searchGradebookQuery,
    required this.onSearchChanged,
    required this.onExportarCSV,
    required this.onReloadGradebook,
    required this.onOpenSpeedGrader,
  });

  @override
  Widget build(BuildContext context) {
    final allTareas = modulos.expand((m) => m.tareas).where((t) => t.id > 0).toList();
    final admitidos = participantes
        .where((p) => (p['rol'] == null || p['rol'] == 'ESTUDIANTE') && p['estadoInscripcion'] == 'ACEPTADO')
        .toList();

    if (isLoadingGradebook) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: Column(
            children: [
              CircularProgressIndicator(color: AppTheme.accent),
              SizedBox(height: 12),
              Text('Cargando matriz global de calificaciones...',
                  style: TextStyle(fontSize: 12, color: AppTheme.inkSoft)),
            ],
          ),
        ),
      );
    }

    if (isDocente || isJurado || isAdmin) {
      final query = searchGradebookQuery.trim().toLowerCase();
      final filteredStudents = admitidos.where((est) {
        if (query.isEmpty) return true;
        final nombre = MoodleUIHelpers.formatNombre(est).toLowerCase();
        final email = (est['email'] ?? '').toString().toLowerCase();
        final grupo = MoodleUIHelpers.formatGrupo(est).toLowerCase();
        return nombre.contains(query) || email.contains(query) || grupo.contains(query);
      }).toList();

      int totalEntregasRecibidas = 0;
      for (final list in entregasGradebook.values) {
        totalEntregasRecibidas += list.length;
      }

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Resumen de Métricas del Gradebook
          Row(
            children: [
              MoodleUIHelpers.buildMetricCard('Estudiantes', '${admitidos.length}', AppTheme.accent, isDark),
              const SizedBox(width: 8),
              MoodleUIHelpers.buildMetricCard('Tareas', '${allTareas.length}', Colors.blue, isDark),
              const SizedBox(width: 8),
              MoodleUIHelpers.buildMetricCard('Entregas', '$totalEntregasRecibidas', const Color(0xFF10B981), isDark),
            ],
          ),
          const SizedBox(height: 14),

          // Header y Buscador
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Libro Central de Calificaciones',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Matriz de notas por estudiante y tarea académica.',
                              style: TextStyle(fontSize: 11, color: AppTheme.inkSoft),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.download_rounded, size: 20, color: AppTheme.accent),
                            tooltip: 'Exportar libro de calificaciones (CSV)',
                            onPressed: onExportarCSV,
                          ),
                          IconButton(
                            icon: const Icon(Icons.refresh_rounded, size: 20, color: AppTheme.accent),
                            tooltip: 'Recargar notas',
                            onPressed: onReloadGradebook,
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    onChanged: onSearchChanged,
                    decoration: InputDecoration(
                      hintText: 'Buscar por estudiante o equipo...',
                      prefixIcon: const Icon(Icons.search, size: 18),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      fillColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                      filled: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          if (filteredStudents.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  admitidos.isEmpty
                      ? 'No hay estudiantes admitidos aún en esta materia.'
                      : 'No se encontraron estudiantes para "$searchGradebookQuery".',
                  style: const TextStyle(fontSize: 12, color: AppTheme.inkSoft),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          else
            ...filteredStudents.map((est) {
              final nombre = MoodleUIHelpers.formatNombre(est);
              final email = (est['email'] ?? '').toString();
              final foto = est['fotoPerfil'] as String?;
              final grupo = MoodleUIHelpers.formatGrupo(est);
              final uId = (est['usuarioId'] as num?)?.toInt() ?? 0;

              double sumNotas = 0;
              int countCalificadas = 0;

              final List<Widget> tareaBadges = [];

              for (final t in allTareas) {
                final shortTitulo = t.titulo.length > 20 ? '${t.titulo.substring(0, 18)}...' : t.titulo;
                final entregasDeTarea = entregasGradebook[t.id] ?? [];
                final entregaEstudiante = entregasDeTarea.firstWhere(
                  (ent) => ent['estudianteId'] == uId || ent['usuarioId'] == uId || ent['estudianteEmail'] == email,
                  orElse: () => <String, dynamic>{},
                );

                if (entregaEstudiante.isNotEmpty) {
                  final calif = (entregaEstudiante['calificacion'] as num?)?.toDouble();
                  if (calif != null) {
                    sumNotas += calif;
                    countCalificadas++;
                    tareaBadges.add(
                      InkWell(
                        onTap: (isDocente || isJurado) ? () => onOpenSpeedGrader(t.id) : null,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          margin: const EdgeInsets.only(right: 6, bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            '$shortTitulo: ${calif.toStringAsFixed(0)}/${t.puntajeMaximo?.toStringAsFixed(0) ?? "100"}',
                            style: const TextStyle(
                                fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                          ),
                        ),
                      ),
                    );
                  } else {
                    tareaBadges.add(
                      InkWell(
                        onTap: (isDocente || isJurado) ? () => onOpenSpeedGrader(t.id) : null,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          margin: const EdgeInsets.only(right: 6, bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.amber.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            '$shortTitulo: Pendiente',
                            style: TextStyle(
                                fontSize: 10.5, fontWeight: FontWeight.bold, color: Colors.amber.shade800),
                          ),
                        ),
                      ),
                    );
                  }
                } else {
                  tareaBadges.add(
                    Container(
                      margin: const EdgeInsets.only(right: 6, bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                      ),
                      child: Text(
                        '$shortTitulo: Sin entrega',
                        style: const TextStyle(fontSize: 10.5, color: AppTheme.inkFaint),
                      ),
                    ),
                  );
                }
              }

              final promedio = countCalificadas > 0 ? (sumNotas / countCalificadas) : 0.0;

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
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
                        MoodleUIHelpers.buildAvatar(nombre, foto, 'ESTUDIANTE'),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(nombre, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                              if (grupo.isNotEmpty)
                                Text(grupo,
                                    style: const TextStyle(
                                        fontSize: 10.5, color: AppTheme.accent, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: countCalificadas > 0
                                ? (promedio >= 51
                                    ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                    : Colors.red.withValues(alpha: 0.15))
                                : AppTheme.accentSoft,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            countCalificadas > 0 ? '${promedio.toStringAsFixed(1)} pts' : 'Sin notas',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: countCalificadas > 0
                                  ? (promedio >= 51 ? const Color(0xFF10B981) : Colors.red)
                                  : AppTheme.inkSoft,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (tareaBadges.isNotEmpty)
                      Wrap(children: tareaBadges)
                    else
                      const Text('No hay tareas registradas en este curso.',
                          style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.inkFaint)),
                  ],
                ),
              );
            }),
        ],
      );
    } else {
      // Vista Estudiante: Reporte personal de calificaciones
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.workspace_premium_rounded, color: AppTheme.accent, size: 22),
                      SizedBox(width: 8),
                      Text('Mis Calificaciones y Retroalimentación',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text('Historial de entregas y notas obtenidas en esta convocatoria.',
                      style: TextStyle(fontSize: 11, color: AppTheme.inkSoft)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (allTareas.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(
                child: Text('Aún no hay tareas publicadas.', style: TextStyle(fontSize: 12, color: AppTheme.inkSoft)),
              ),
            )
          else
            ...allTareas.map((tarea) {
              final tieneNota = tarea.calificacion != null;
              final entregada = tarea.estadoEntrega == 'ENTREGADO' || tarea.estadoEntrega == 'CALIFICADO';

              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              tarea.titulo,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: tieneNota
                                  ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                  : (entregada
                                      ? Colors.amber.withValues(alpha: 0.15)
                                      : (isDark ? AppTheme.darkLine : AppTheme.line)),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              tieneNota
                                  ? '${tarea.calificacion!.toStringAsFixed(1)} / ${tarea.puntajeMaximo?.toStringAsFixed(0) ?? "100"}'
                                  : (entregada ? 'Entregada • Pendiente' : 'Sin entregar'),
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                                color: tieneNota
                                    ? const Color(0xFF10B981)
                                    : (entregada ? Colors.amber.shade800 : AppTheme.inkFaint),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (tarea.retroalimentacion != null && tarea.retroalimentacion!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Retroalimentación del Docente:',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.accent)),
                              const SizedBox(height: 2),
                              Text(tarea.retroalimentacion!,
                                  style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInk : AppTheme.ink)),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),
        ],
      );
    }
  }
}
