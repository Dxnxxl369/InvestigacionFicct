import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../widgets/moodle_widgets.dart';
import '../usuarios/usuarios_screen.dart';
import '../moodle/mis_pendientes_screen.dart';

class DashboardScreen extends StatefulWidget {
  final AuthService authService;
  final Function(int) onNavigateTab;
  final VoidCallback onOpenSpeedGrader;
  final Function(ConvocatoriaModel) onOpenAula;
  final VoidCallback onToggleTheme;
  final VoidCallback? onOpenMisPendientes;

  const DashboardScreen({
    super.key,
    required this.authService,
    required this.onNavigateTab,
    required this.onOpenSpeedGrader,
    required this.onOpenAula,
    required this.onToggleTheme,
    this.onOpenMisPendientes,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<ConvocatoriaModel> _misCursos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final cursos = await ApiService.getMisAreas();
    if (mounted) {
      setState(() {
        _misCursos = cursos;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.authService.currentUser;
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
          const NotificacionBadge(),
          IconButton(
            icon: Icon(isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded),
            tooltip: isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro',
            onPressed: widget.onToggleTheme,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualizar',
            onPressed: _loadData,
          ),
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: GestureDetector(
              onTap: () => widget.onNavigateTab(4), // Ir a perfil
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
            // Saludo personalizado con datos de la BD
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

            // Métricas Reales desde PostgreSQL
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _MetricItem(
                      label: 'Mis Áreas',
                      value: _isLoading ? '...' : _misCursos.length.toString(),
                      color: AppTheme.accent,
                    ),
                    Container(width: 1, height: 35, color: isDark ? AppTheme.darkLine : AppTheme.line),
                    _MetricItem(
                      label: 'Rol Activo',
                      value: user?.rol == 'DOCENTE'
                          ? 'DOC'
                          : user?.rol == 'JURADO'
                              ? 'JUR'
                              : user?.rol == 'ADMIN'
                                  ? 'ADM'
                                  : 'EST',
                      color: AppTheme.seal,
                    ),
                    Container(width: 1, height: 35, color: isDark ? AppTheme.darkLine : AppTheme.line),
                    _MetricItem(
                      label: 'Semestre',
                      value: '2-2026',
                      color: const Color(0xFF10B981),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Accesos Inmediatos
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
                      onTap: () => widget.onNavigateTab(1), // Mis áreas
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
                              'Aulas Virtuales',
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
                  child: Builder(
                    builder: (context) {
                      final isDocenteOJurado = user != null && (user.rol == 'DOCENTE' || user.rol == 'JURADO');
                      final isAdmin = user != null && user.rol == 'ADMIN';

                      final icon = isDocenteOJurado
                          ? Icons.grading_rounded
                          : Icons.campaign_rounded;

                      final iconColor = isDocenteOJurado
                          ? AppTheme.seal
                          : (isAdmin ? const Color(0xFF10B981) : AppTheme.accent);

                      final bgColor = isDocenteOJurado
                          ? AppTheme.sealSoft
                          : (isAdmin
                              ? const Color(0xFF10B981).withValues(alpha: 0.15)
                              : AppTheme.accentSoft);

                      final title = isDocenteOJurado
                          ? 'Calificar'
                          : 'Convocatorias';

                      final subtitle = isDocenteOJurado
                          ? 'Calificar Entregas'
                          : (isAdmin ? 'Crear & Gestionar' : 'Ferias & Eventos');

                      return Card(
                        child: InkWell(
                          onTap: isDocenteOJurado
                              ? widget.onOpenSpeedGrader
                              : () => widget.onNavigateTab(2),
                          borderRadius: BorderRadius.circular(20),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: bgColor,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    icon,
                                    color: iconColor,
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  title,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                  ),
                                ),
                                Text(
                                  subtitle,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            if (user?.rol == 'ESTUDIANTE') ...[
              const SizedBox(height: 12),
              Card(
                color: isDark ? AppTheme.darkPaperSunken : const Color(0xFFEFF6FF),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: isDark ? AppTheme.darkLine : const Color(0xFFBFDBFE),
                  ),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () {
                    if (widget.onOpenMisPendientes != null) {
                      widget.onOpenMisPendientes!();
                    } else {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (ctx) => MisPendientesScreen(
                            onBack: () => Navigator.of(ctx).pop(),
                          ),
                        ),
                      );
                    }
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2563EB),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.assignment_late_rounded, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Mis Tareas & Pendientes',
                                style: TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                ),
                              ),
                              Text(
                                'Revisa entregas, fechas límite y calificaciones',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, color: AppTheme.accent),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 22),

            // Actividad Reciente Académica
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'MIS ÁREAS ACADÉMICAS',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.6,
                    color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                  ),
                ),
                TextButton(
                  onPressed: () => widget.onNavigateTab(1),
                  child: const Text('Ver todas', style: TextStyle(fontSize: 12, color: AppTheme.accent)),
                ),
              ],
            ),
            const SizedBox(height: 6),

            if (_isLoading)
              const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: AppTheme.accent)))
            else if (_misCursos.isNotEmpty)
              ..._misCursos.take(2).map((c) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    onTap: () => widget.onOpenAula(c),
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.school_rounded, color: AppTheme.accent),
                    ),
                    title: Text(
                      c.titulo,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      '${c.tipo} • Rol: ${c.miRol ?? "Inscrito"}',
                      style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded, size: 20),
                  ),
                );
              })
            else
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded, color: AppTheme.inkFaint, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'No tienes asignaturas inscritas actualmente.',
                          style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                        ),
                      ),
                      TextButton(
                        onPressed: () => widget.onNavigateTab(2),
                        child: const Text('Explorar', style: TextStyle(color: AppTheme.accent)),
                      ),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 10),

            // Item 2: Diferenciación según Rol
            if (user != null && (user.rol == 'DOCENTE' || user.rol == 'JURADO'))
              Card(
                child: ListTile(
                  onTap: () => widget.onNavigateTab(1), // Mis Áreas -> Calificar entregas en su aula
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.grading_rounded, color: AppTheme.seal),
                  ),
                  title: Text(
                    'Evaluación y Calificación',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                    ),
                  ),
                  subtitle: Text(
                    'Accede a tus áreas para calificar entregas pendientes',
                    style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded, size: 20),
                ),
              )
            else if (user != null && user.rol == 'ADMIN') ...[
              Card(
                child: ListTile(
                  onTap: () => widget.onNavigateTab(2), // Pestaña de Convocatorias
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.admin_panel_settings_rounded, color: AppTheme.accent),
                  ),
                  title: Text(
                    'Gestión y Supervisión Institucional',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                    ),
                  ),
                  subtitle: Text(
                    'Monitoreo general de convocatorias y áreas académicas',
                    style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded, size: 20),
                ),
              ),
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (ctx) => UsuariosScreen(onBack: () => Navigator.pop(ctx)),
                      ),
                    );
                  },
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.people_alt_rounded, color: AppTheme.seal),
                  ),
                  title: Text(
                    'Gestión de Usuarios & Permisos',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                    ),
                  ),
                  subtitle: Text(
                    'Administra roles, activa cuentas y configura la matriz de acceso',
                    style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded, size: 20),
                ),
              ),
            ] else
              Card(
                child: ListTile(
                  onTap: () => widget.onNavigateTab(2), // Pestaña de Convocatorias
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.campaign_outlined, color: AppTheme.accent),
                  ),
                  title: Text(
                    'Explorar Convocatorias FICCT',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                    ),
                  ),
                  subtitle: Text(
                    'Postúlate de forma individual o con tu equipo',
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
            fontSize: 20,
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
