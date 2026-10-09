import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/actividad_grupo_model.dart';
import '../../../models/modulo_model.dart';
import '../../../models/tarea_model.dart';
import 'moodle_ui_helpers.dart';

class TabModulosYTareas extends StatelessWidget {
  final List<ActividadGrupoModel> actividadesGrupo;
  final List<ModuloModel> modulos;
  final bool isDark;
  final bool isDocente;
  final bool isJurado;
  final bool isAdmin;
  final Function(int) onOpenSpeedGrader;
  final Function(TareaModel) onOpenTarea;
  final Function(TareaModel) onShowAdminSupervision;
  final VoidCallback onCrearModulo;
  final Function(ModuloModel) onEditarModulo;
  final Function({int? moduloId}) onCrearTarea;
  final Function(TareaModel) onEditarTarea;
  final Function(int) onToggleHabilitarTarea;
  final VoidCallback onSwitchToGruposTab;

  const TabModulosYTareas({
    super.key,
    required this.actividadesGrupo,
    required this.modulos,
    required this.isDark,
    required this.isDocente,
    required this.isJurado,
    required this.isAdmin,
    required this.onOpenSpeedGrader,
    required this.onOpenTarea,
    required this.onShowAdminSupervision,
    required this.onCrearModulo,
    required this.onEditarModulo,
    required this.onCrearTarea,
    required this.onEditarTarea,
    required this.onToggleHabilitarTarea,
    required this.onSwitchToGruposTab,
  });

  @override
  Widget build(BuildContext context) {
    final isDocenteOAdmin = isDocente || isAdmin;
    final isDocenteOJurado = isDocente || isJurado;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Banner de Actividades de Selección de Grupo (Moodle Choice) en el flujo del aula
        if (actividadesGrupo.isNotEmpty) ...[
          ...actividadesGrupo.map((act) {
            final tieneGrupo = act.grupoSeleccionadoNombre != null;
            return Card(
              margin: const EdgeInsets.only(bottom: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: AppTheme.accent.withValues(alpha: 0.35), width: 1.5),
              ),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    colors: isDark
                        ? [AppTheme.seal.withValues(alpha: 0.35), AppTheme.darkPaperRaised]
                        : [AppTheme.accent.withValues(alpha: 0.08), Colors.white],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.accent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.groups_rounded, color: AppTheme.accent, size: 20),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text(
                                    'ACTIVIDAD DE SELECCIÓN DE GRUPO',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.accent,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const Spacer(),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: act.abierta
                                          ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                          : Colors.red.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      act.abierta ? 'ABIERTA' : 'CERRADA',
                                      style: TextStyle(
                                        fontSize: 8.5,
                                        fontWeight: FontWeight.bold,
                                        color: act.abierta ? const Color(0xFF10B981) : Colors.red,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                act.titulo,
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isDocenteOAdmin
                          ? 'Gestión de equipos: ${act.grupos.length} grupos configurados con cupos de ${act.capacidadPorGrupo} integrantes.'
                          : (isJurado
                              ? 'Visualización de equipos: ${act.grupos.length} grupos configurados.'
                              : (tieneGrupo
                                  ? '✓ Quedaste formalmente registrado en: ${act.grupoSeleccionadoNombre}'
                                  : 'Cupos limitados por grupo. Elige tu grupo antes de la fecha de cierre.')),
                      style: TextStyle(
                        fontSize: 11.5,
                        color: tieneGrupo ? const Color(0xFF10B981) : (isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                        fontWeight: tieneGrupo ? FontWeight.bold : FontWeight.normal,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerRight,
                      child: ElevatedButton.icon(
                        onPressed: onSwitchToGruposTab,
                        icon: const Icon(Icons.arrow_forward_rounded, size: 14),
                        label: Text(
                          isDocenteOAdmin
                              ? 'Gestionar Equipos'
                              : (isJurado
                                  ? 'Ver Equipos'
                                  : (tieneGrupo ? 'Ver / Modificar Elección' : 'Seleccionar Grupo')),
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],

        // Módulos temáticos del aula virtual
        if (modulos.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                children: [
                  const Icon(Icons.folder_open_rounded, size: 40, color: AppTheme.inkFaint),
                  const SizedBox(height: 12),
                  const Text('No hay módulos de aprendizaje publicados aún.',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('El docente publicará los contenidos temáticos y tareas aquí.',
                      style: TextStyle(fontSize: 11, color: AppTheme.inkSoft)),
                  if (isDocenteOAdmin) ...[
                    const SizedBox(height: 14),
                    ElevatedButton.icon(
                      onPressed: onCrearModulo,
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Crear Primer Módulo'),
                    ),
                  ],
                ],
              ),
            ),
          )
        else
          ...modulos.map((modulo) {
            final hasCover = modulo.imagenPortada != null && modulo.imagenPortada!.trim().isNotEmpty;
            final coverUrl = modulo.imagenPortada?.trim() ?? '';

            return Card(
              margin: const EdgeInsets.only(bottom: 14),
              clipBehavior: Clip.antiAlias,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Theme(
                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                child: Column(
                  children: [
                    if (hasCover)
                      SizedBox(
                        height: 110,
                        width: double.infinity,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.network(
                              coverUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                child: const Icon(Icons.broken_image_outlined, color: AppTheme.inkFaint),
                              ),
                            ),
                            Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.transparent,
                                    Colors.black.withValues(alpha: 0.6),
                                  ],
                                ),
                              ),
                            ),
                            Positioned(
                              bottom: 8,
                              left: 14,
                              right: 14,
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.5),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '${modulo.tareas.length} ${modulo.tareas.length == 1 ? 'actividad' : 'actividades'}',
                                      style:
                                          const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ExpansionTile(
                      initiallyExpanded: true,
                      tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      leading: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppTheme.accentSoft,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: hasCover
                            ? Image.network(
                                coverUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) =>
                                    const Icon(Icons.folder_rounded, color: AppTheme.accent, size: 20),
                              )
                            : const Icon(Icons.folder_rounded, color: AppTheme.accent, size: 20),
                      ),
                      title: Text(
                        modulo.titulo,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppTheme.darkInk : AppTheme.ink,
                        ),
                      ),
                      subtitle: Text(
                        modulo.descripcion.isNotEmpty
                            ? modulo.descripcion
                            : '${modulo.tareas.length} actividades disponibles',
                        style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      children: [
                        if (modulo.tareas.isEmpty)
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              'No hay tareas publicadas en este módulo.',
                              style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                            ),
                          )
                        else
                          ...modulo.tareas.map((tarea) {
                            final entregada = tarea.estadoEntrega == 'ENTREGADO' || tarea.estadoEntrega == 'CALIFICADO';
                            return InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () {
                                if (isDocenteOJurado) {
                                  onOpenSpeedGrader(tarea.id);
                                } else if (isAdmin) {
                                  onShowAdminSupervision(tarea);
                                } else {
                                  onOpenTarea(tarea);
                                }
                              },
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: !tarea.habilitada
                                        ? (isDark ? AppTheme.darkLine : AppTheme.line).withValues(alpha: 0.5)
                                        : (entregada
                                            ? const Color(0xFF10B981).withValues(alpha: 0.3)
                                            : (isDark ? AppTheme.darkLine : AppTheme.line)),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Fila 1: Icono + Título Completo + Acciones Docente/Admin
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          width: 32,
                                          height: 32,
                                          margin: const EdgeInsets.only(right: 10, top: 1),
                                          decoration: BoxDecoration(
                                            color: entregada
                                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                                : (isDocenteOJurado
                                                    ? AppTheme.sealSoft
                                                    : (isAdmin
                                                        ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                                        : AppTheme.goldSoft)),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Icon(
                                            isDocenteOJurado
                                                ? Icons.grading_rounded
                                                : (isAdmin
                                                    ? Icons.assignment_outlined
                                                    : (entregada
                                                        ? Icons.check_circle_rounded
                                                        : Icons.pending_actions_rounded)),
                                            color: entregada
                                                ? const Color(0xFF10B981)
                                                : (isDocenteOJurado
                                                    ? AppTheme.seal
                                                    : (isAdmin ? const Color(0xFF10B981) : AppTheme.gold)),
                                            size: 18,
                                          ),
                                        ),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                tarea.titulo,
                                                style: TextStyle(
                                                  fontSize: 13.5,
                                                  fontWeight: FontWeight.bold,
                                                  color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                                  height: 1.25,
                                                ),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              if (tarea.descripcion.isNotEmpty) ...[
                                                const SizedBox(height: 2),
                                                Text(
                                                  tarea.descripcion,
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                                  ),
                                                  maxLines: 2,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ],
                                            ],
                                          ),
                                        ),
                                        if (isDocenteOAdmin) ...[
                                          const SizedBox(width: 6),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              InkWell(
                                                borderRadius: BorderRadius.circular(6),
                                                onTap: () => onToggleHabilitarTarea(tarea.id),
                                                child: Padding(
                                                  padding: const EdgeInsets.all(4),
                                                  child: Icon(
                                                    tarea.habilitada
                                                        ? Icons.visibility_rounded
                                                        : Icons.visibility_off_rounded,
                                                    size: 16,
                                                    color: tarea.habilitada ? AppTheme.accent : AppTheme.inkFaint,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 4),
                                              InkWell(
                                                borderRadius: BorderRadius.circular(6),
                                                onTap: () => onEditarTarea(tarea),
                                                child: const Padding(
                                                  padding: EdgeInsets.all(4),
                                                  child: Icon(Icons.edit_outlined, size: 16, color: AppTheme.accent),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 8),

                                    // Fila 2: Chips y Badge
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                          decoration: BoxDecoration(
                                            color: (tarea.esGrupal ? Colors.blue : Colors.purple).withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(5),
                                          ),
                                          child: Text(
                                            tarea.esGrupal ? '👥 Grupal' : '👤 Individual',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                              color: tarea.esGrupal ? Colors.blue.shade700 : Colors.purple.shade700,
                                            ),
                                          ),
                                        ),
                                        if (tarea.fechaLimite != null && tarea.fechaLimite!.isNotEmpty) ...[
                                          const SizedBox(width: 6),
                                          Flexible(
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.event_outlined,
                                                    size: 12, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                                                const SizedBox(width: 3),
                                                Flexible(
                                                  child: Text(
                                                    MoodleUIHelpers.formatearFechaCorta(tarea.fechaLimite),
                                                    style: TextStyle(
                                                      fontSize: 10.5,
                                                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                                    ),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                        const Spacer(),
                                        if (isDocenteOJurado)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: AppTheme.accentSoft,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Text(
                                                  'CALIFICAR',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: AppTheme.accentDark,
                                                    letterSpacing: 0.3,
                                                  ),
                                                ),
                                                SizedBox(width: 3),
                                                Icon(Icons.arrow_forward_ios_rounded,
                                                    size: 9, color: AppTheme.accentDark),
                                              ],
                                            ),
                                          )
                                        else if (isAdmin)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Text(
                                              'SUPERVISIÓN',
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: Color(0xFF10B981),
                                              ),
                                            ),
                                          )
                                        else ...[
                                          if (tarea.calificacion != null) ...[
                                            Text(
                                              'Nota: ${tarea.calificacion}/100',
                                              style: const TextStyle(
                                                  fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.accent),
                                            ),
                                            const SizedBox(width: 6),
                                          ],
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                            decoration: BoxDecoration(
                                              color: entregada
                                                  ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                                  : AppTheme.goldSoft,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              entregada ? 'ENTREGADO' : (tarea.estadoEntrega ?? 'SIN_ENTREGAR'),
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: entregada ? const Color(0xFF10B981) : AppTheme.gold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        if (isDocenteOAdmin && modulo.id > 0)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(14, 4, 14, 10),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton.icon(
                                  onPressed: () => onEditarModulo(modulo),
                                  icon: const Icon(Icons.edit_outlined, size: 14),
                                  label: const Text('Editar Módulo', style: TextStyle(fontSize: 11)),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton.icon(
                                  onPressed: () => onCrearTarea(moduloId: modulo.id),
                                  icon: const Icon(Icons.add_task_rounded, size: 14),
                                  label: const Text('Nueva Tarea', style: TextStyle(fontSize: 11)),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
