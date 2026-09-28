import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/moodle_widgets.dart';

class DashboardScreen extends StatelessWidget {
  final AuthService authService;
  final Function(int) onNavigateTab;
  final VoidCallback onOpenSpeedGrader;
  final VoidCallback onOpenTarea;

  const DashboardScreen({
    super.key,
    required this.authService,
    required this.onNavigateTab,
    required this.onOpenSpeedGrader,
    required this.onOpenTarea,
  });

  @override
  Widget build(BuildContext context) {
    final user = authService.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'FICCT',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: isDark ? AppTheme.darkAccent : AppTheme.accent,
              ),
            ),
            const SizedBox(width: 4),
            const Text('Móvil', style: TextStyle(fontWeight: FontWeight.w300)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Sin notificaciones pendientes')),
              );
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: GestureDetector(
              onTap: () => onNavigateTab(4), // Ir a perfil
              child: CircleAvatar(
                radius: 16,
                backgroundColor: AppTheme.accent,
                child: Text(
                  user?.inicial ?? 'U',
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Saludo personalizado
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    RoleBadge(role: user?.rol ?? 'ESTUDIANTE'),
                    const SizedBox(height: 6),
                    Text(
                      'Hola, ${user?.nombre ?? "Usuario"}',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    Text(
                      'Facultad de Cs. de la Computación',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Métricas Rápidas
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _MetricItem(label: 'Mis Cursos', value: '4', color: AppTheme.accent),
                    Container(width: 1, height: 35, color: isDark ? AppTheme.darkLine : AppTheme.line),
                    _MetricItem(label: 'Entregas', value: '12', color: AppTheme.seal),
                    Container(width: 1, height: 35, color: isDark ? AppTheme.darkLine : AppTheme.line),
                    _MetricItem(label: 'Pendientes', value: '2', color: AppTheme.danger),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Accesos Rápidos
            Text(
              'ACCESOS INMEDIATOS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.6,
                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
              ),
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                Expanded(
                  child: Card(
                    child: InkWell(
                      onTap: () => onNavigateTab(1), // Mis áreas
                      borderRadius: BorderRadius.circular(20),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.accentSoft,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.school_rounded, color: AppTheme.accent, size: 22),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Aulas Moodle',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppTheme.darkInk : AppTheme.ink,
                              ),
                            ),
                            Text(
                              'Módulos & Tareas',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Card(
                    child: InkWell(
                      onTap: onOpenSpeedGrader,
                      borderRadius: BorderRadius.circular(20),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.sealSoft,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.speed_rounded, color: AppTheme.seal, size: 22),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'SpeedGrader',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppTheme.darkInk : AppTheme.ink,
                              ),
                            ),
                            Text(
                              'Calificar en vivo',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),

            // Actividad Reciente
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'ACTIVIDAD RECIENTE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.6,
                    color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                  ),
                ),
                TextButton(
                  onPressed: () => onNavigateTab(1),
                  child: const Text('Ver todo', style: TextStyle(fontSize: 12, color: AppTheme.accent)),
                ),
              ],
            ),
            const SizedBox(height: 6),

            // Item 1: Tarea por entregar
            Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                onTap: onOpenTarea,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.assignment_outlined, color: AppTheme.accent),
                ),
                title: Text(
                  'Tarea: Planteamiento del Problema',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                  ),
                ),
                subtitle: Text(
                  'Taller de Grado I • Vence 30 Sept',
                  style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                ),
                trailing: const Icon(Icons.chevron_right_rounded, size: 20),
              ),
            ),

            // Item 2: SpeedGrader revisión
            Card(
              child: ListTile(
                onTap: onOpenSpeedGrader,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.grading_rounded, color: AppTheme.seal),
                ),
                title: Text(
                  'SpeedGrader: Tesis IA',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                  ),
                ),
                subtitle: Text(
                  'Carlos Méndez • Listo para calificar',
                  style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                ),
                trailing: const Icon(Icons.chevron_right_rounded, size: 20),
              ),
            ),
            const SizedBox(height: 60), // Margen para la barra flotante
          ],
        ),
      ),
    );
  }
}

class _MetricItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MetricItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: color,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppTheme.inkFaint,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
