import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../widgets/moodle_widgets.dart';
import 'moodle_ui_helpers.dart';

class TabParticipantesMoodle extends StatelessWidget {
  final bool isLoadingParticipantes;
  final List<Map<String, dynamic>> participantes;
  final Set<int> selectedPendientes;
  final bool isActionLoading;
  final bool isDark;
  final bool isDocenteOAdmin;
  final Function(int partId, bool isSelected) onToggleSelectPendiente;
  final VoidCallback onToggleSelectAllPendientes;
  final Function(int partId, String nombre) onAdmitir;
  final Function(int partId, String nombre) onRechazar;
  final VoidCallback onAdmitirLote;
  final VoidCallback onRechazarLote;

  const TabParticipantesMoodle({
    super.key,
    required this.isLoadingParticipantes,
    required this.participantes,
    required this.selectedPendientes,
    required this.isActionLoading,
    required this.isDark,
    required this.isDocenteOAdmin,
    required this.onToggleSelectPendiente,
    required this.onToggleSelectAllPendientes,
    required this.onAdmitir,
    required this.onRechazar,
    required this.onAdmitirLote,
    required this.onRechazarLote,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoadingParticipantes) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(color: AppTheme.accent),
        ),
      );
    }

    final docentesYJurados = participantes.where((p) => p['rol'] == 'DOCENTE' || p['rol'] == 'JURADO').toList();
    final pendientes = participantes.where((p) => p['estadoInscripcion'] == 'PENDIENTE').toList();
    final admitidos = participantes
        .where((p) => (p['rol'] == null || p['rol'] == 'ESTUDIANTE') && p['estadoInscripcion'] == 'ACEPTADO')
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Tribunal y Docentes Asignados
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.school_rounded, color: AppTheme.accent, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Tribunal & Docentes a Cargo (${docentesYJurados.length})',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (docentesYJurados.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'No hay docentes o jurados asignados formalmente a esta área.',
                      style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                          fontStyle: FontStyle.italic),
                    ),
                  )
                else
                  ...docentesYJurados.map((doc) {
                    final nombre = MoodleUIHelpers.formatNombre(doc);
                    final rol = (doc['rol'] ?? 'DOCENTE').toString().toUpperCase();
                    final email = (doc['email'] ?? '').toString();
                    final foto = doc['fotoPerfil'] as String?;
                    final uId = (doc['usuarioId'] as num?)?.toInt() ?? 0;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: uId > 0
                            ? () => showPerfilParticipanteModal(
                                  context,
                                  usuarioId: uId,
                                  fallbackNombre: nombre,
                                  fallbackRol: rol,
                                  fallbackEmail: email,
                                  fallbackFoto: foto,
                                )
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          child: Row(
                            children: [
                              MoodleUIHelpers.buildAvatar(nombre, foto, rol),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      nombre,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                      ),
                                    ),
                                    if (email.isNotEmpty)
                                      Text(
                                        email,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              RoleBadge(role: rol),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.chevron_right_rounded,
                                size: 18,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // 2. Solicitudes de Admisión Pendientes (Para Docente y Admin)
        if (isDocenteOAdmin && pendientes.isNotEmpty) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.pending_actions_rounded, color: Colors.amber, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Solicitudes de Admisión (${pendientes.length})',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        icon: Icon(
                          selectedPendientes.length == pendientes.length
                              ? Icons.check_box_rounded
                              : Icons.check_box_outline_blank_rounded,
                          size: 18,
                        ),
                        label: Text(
                          selectedPendientes.length == pendientes.length ? 'Deseleccionar' : 'Seleccionar todo',
                          style: const TextStyle(fontSize: 11),
                        ),
                        onPressed: onToggleSelectAllPendientes,
                      ),
                    ],
                  ),
                  if (selectedPendientes.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.accentSoft,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Text(
                            '${selectedPendientes.length} seleccionados',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.accentDark,
                            ),
                          ),
                          const Spacer(),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.check_rounded, size: 14),
                            label: const Text('Admitir', style: TextStyle(fontSize: 11)),
                            onPressed: isActionLoading ? null : onAdmitirLote,
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.danger,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.close_rounded, size: 14),
                            label: const Text('Rechazar', style: TextStyle(fontSize: 11)),
                            onPressed: isActionLoading ? null : onRechazarLote,
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  ...pendientes.map((sol) {
                    final partId = sol['id'] as int? ?? 0;
                    final nombre = MoodleUIHelpers.formatNombre(sol);
                    final email = (sol['email'] ?? '').toString();
                    final foto = sol['fotoPerfil'] as String?;
                    final uId = (sol['usuarioId'] as num?)?.toInt() ?? 0;
                    final grupo = MoodleUIHelpers.formatGrupo(sol);
                    final isChecked = selectedPendientes.contains(partId);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isChecked
                              ? AppTheme.accent
                              : (isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                        ),
                      ),
                      child: Row(
                        children: [
                          Checkbox(
                            value: isChecked,
                            activeColor: AppTheme.accent,
                            onChanged: (val) => onToggleSelectPendiente(partId, val == true),
                          ),
                          InkWell(
                            onTap: uId > 0
                                ? () => showPerfilParticipanteModal(
                                      context,
                                      usuarioId: uId,
                                      fallbackNombre: nombre,
                                      fallbackRol: 'ESTUDIANTE',
                                      fallbackEmail: email,
                                      fallbackFoto: foto,
                                    )
                                : null,
                            child: MoodleUIHelpers.buildAvatar(nombre, foto, 'ESTUDIANTE'),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: InkWell(
                              onTap: uId > 0
                                  ? () => showPerfilParticipanteModal(
                                        context,
                                        usuarioId: uId,
                                        fallbackNombre: nombre,
                                        fallbackRol: 'ESTUDIANTE',
                                        fallbackEmail: email,
                                        fallbackFoto: foto,
                                      )
                                  : null,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    nombre,
                                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                                  ),
                                  if (email.isNotEmpty)
                                    Text(
                                      email,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                      ),
                                    ),
                                  if (grupo.isNotEmpty)
                                    Text(
                                      'Equipo solicitado: $grupo',
                                      style: const TextStyle(
                                          fontSize: 10.5, color: AppTheme.accent, fontWeight: FontWeight.w600),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 22),
                            tooltip: 'Admitir',
                            onPressed: isActionLoading ? null : () => onAdmitir(partId, nombre),
                          ),
                          IconButton(
                            icon: const Icon(Icons.cancel_rounded, color: AppTheme.danger, size: 22),
                            tooltip: 'Rechazar',
                            onPressed: isActionLoading ? null : () => onRechazar(partId, nombre),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
        ],

        // 3. Estudiantes Matriculados
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.groups_rounded, color: Color(0xFF10B981), size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Estudiantes Matriculados (${admitidos.length})',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (admitidos.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(
                      child: Text('No hay estudiantes admitidos aún en esta área.',
                          style: TextStyle(fontSize: 12, color: AppTheme.inkSoft)),
                    ),
                  )
                else
                  ...admitidos.map((part) {
                    final nombre = MoodleUIHelpers.formatNombre(part);
                    final email = (part['email'] ?? '').toString();
                    final foto = part['fotoPerfil'] as String?;
                    final uId = (part['usuarioId'] as num?)?.toInt() ?? 0;
                    final grupo = MoodleUIHelpers.formatGrupo(part);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: uId > 0
                            ? () => showPerfilParticipanteModal(
                                  context,
                                  usuarioId: uId,
                                  fallbackNombre: nombre,
                                  fallbackRol: 'ESTUDIANTE',
                                  fallbackEmail: email,
                                  fallbackFoto: foto,
                                )
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          child: Row(
                            children: [
                              MoodleUIHelpers.buildAvatar(nombre, foto, 'ESTUDIANTE'),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      nombre,
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                      ),
                                    ),
                                    if (email.isNotEmpty)
                                      Text(
                                        email,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                        ),
                                      ),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Icon(
                                          grupo.isNotEmpty ? Icons.group_rounded : Icons.group_off_rounded,
                                          size: 13,
                                          color: grupo.isNotEmpty ? const Color(0xFF10B981) : AppTheme.inkFaint,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          grupo.isNotEmpty ? 'Grupo: $grupo' : 'Sin grupo asignado',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: grupo.isNotEmpty ? FontWeight.w600 : FontWeight.normal,
                                            color: grupo.isNotEmpty ? const Color(0xFF10B981) : AppTheme.inkFaint,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Icon(
                                Icons.chevron_right_rounded,
                                size: 18,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                              ),
                            ],
                          ),
                        ),
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
