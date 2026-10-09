import 'dart:async';
import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/convocatoria_model.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../screens/moodle/tarea_entrega_screen.dart';
import '../screens/moodle/speedgrader_screen.dart';
import 'liquid_glass.dart';

class RoleBadge extends StatelessWidget {
  final String role;

  const RoleBadge({super.key, required this.role});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color text;
    String label;

    switch (role.toUpperCase()) {
      case 'DOCENTE':
        bg = AppTheme.accentSoft;
        text = AppTheme.accentDark;
        label = 'Docente Titular';
        break;
      case 'JURADO':
        bg = AppTheme.sealSoft;
        text = AppTheme.seal;
        label = 'Jurado Calificador';
        break;
      case 'ADMIN':
        bg = AppTheme.dangerSoft;
        text = AppTheme.danger;
        label = 'Administrador';
        break;
      default:
        bg = const Color(0xFFE0F2FE);
        text = const Color(0xFF0369A1);
        label = 'Estudiante';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: text,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class CourseCardMoodle extends StatelessWidget {
  final ConvocatoriaModel curso;
  final VoidCallback onTap;

  const CourseCardMoodle({
    super.key,
    required this.curso,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(
                    colors: [AppTheme.accent, AppTheme.seal],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(
                  Icons.school_rounded,
                  color: Colors.white,
                  size: 30,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.accentSoft,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            curso.tipo,
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.accentDark,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: curso.miEstadoInscripcion == 'ACEPTADO'
                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                : curso.miEstadoInscripcion == 'PENDIENTE'
                                    ? Colors.amber.withValues(alpha: 0.15)
                                    : AppTheme.accentSoft,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            curso.miEstadoInscripcion == 'ACEPTADO'
                                ? '✓ Admitido'
                                : curso.miEstadoInscripcion == 'PENDIENTE'
                                    ? '⏳ Pendiente'
                                    : 'Activo',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: curso.miEstadoInscripcion == 'ACEPTADO'
                                  ? const Color(0xFF10B981)
                                  : curso.miEstadoInscripcion == 'PENDIENTE'
                                      ? Colors.amber.shade800
                                      : (isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      curso.titulo,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      curso.descripcion,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          curso.miRol != null ? 'Rol: ${curso.miRol}' : 'Área de Trabajo',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.accent,
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward_ios_rounded,
                          size: 12,
                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MoodleSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const MoodleSwitch({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: () => onChanged(!value),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: value
              ? (isDark ? const Color(0x33F59E0B) : const Color(0x1DF59E0B))
              : (isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: value ? const Color(0x66F59E0B) : (isDark ? AppTheme.darkLine : AppTheme.lineSoft),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: value ? const Color(0x33F59E0B) : (isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                value ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                size: 20,
                color: value ? const Color(0xFFD97706) : (isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value ? 'Cursos Ocultos para Otros' : 'Cursos Visibles Públicamente',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value
                        ? 'Solo tú y administración pueden ver tu lista de cursos'
                        : 'Visible para todos los integrantes de la facultad',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                    ),
                  ),
                ],
              ),
            ),
            Switch(
              value: value,
              onChanged: onChanged,
              activeColor: const Color(0xFFD97706),
            ),
          ],
        ),
      ),
    );
  }
}

// Modal Moodle para Ficha y Perfil Académico de Participantes
void showPerfilParticipanteModal(
  BuildContext context, {
  required int usuarioId,
  String? fallbackNombre,
  String? fallbackRol,
  String? fallbackEmail,
  String? fallbackFoto,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  final currentUser = StorageService.getCachedUser();
  final esMismo = (currentUser != null && currentUser.id == usuarioId) || (currentUser?.rol == 'ADMIN');

  showLiquidGlassModalBottomSheet(
    context: context,
    maxHeightFactor: 0.85,
    builder: (ctx) {
      return FutureBuilder<Map<String, dynamic>?>(
        future: ApiService.getPerfilPublico(usuarioId),
        builder: (ctx, snapshot) {
          final perfil = snapshot.data;
          final cargando = snapshot.connectionState == ConnectionState.waiting;

          final nombre = (perfil?['nombreCompleto'] as String?)?.isNotEmpty == true
              ? perfil!['nombreCompleto'] as String
              : (fallbackNombre ?? 'Participante');
          final email = (perfil?['email'] as String?)?.isNotEmpty == true
              ? perfil!['email'] as String
              : (fallbackEmail ?? '');
          final rol = (perfil?['rol'] as String?)?.isNotEmpty == true
              ? perfil!['rol'] as String
              : (fallbackRol ?? 'ESTUDIANTE');
          final foto = (perfil?['fotoPerfil'] as String?) ?? fallbackFoto;
          final fotoUrl = ApiService.resolveFileUrl(foto);
          final bio = perfil?['descripcion'] as String?;
          final esPropioPerfil = (perfil?['esPropioPerfil'] as bool? ?? false) || esMismo;
          final ocultarCursos = (perfil?['ocultarCursos'] as bool? ?? false) && !esPropioPerfil;
          final cursos = (perfil?['cursos'] as List<dynamic>?) ?? [];

          return Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Cabecera con Foto, Nombre y Rol
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: rol == 'DOCENTE'
                          ? AppTheme.accent
                          : (rol == 'JURADO' ? AppTheme.seal : AppTheme.gold),
                      backgroundImage: fotoUrl != null ? NetworkImage(fotoUrl) : null,
                      child: fotoUrl == null
                          ? Text(
                              nombre.isNotEmpty ? nombre[0].toUpperCase() : 'U',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            nombre,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppTheme.darkInk : AppTheme.ink,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          if (email.isNotEmpty)
                            Text(
                              email,
                              style: TextStyle(
                                fontSize: 11.5,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          const SizedBox(height: 6),
                          RoleBadge(role: rol),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 14),

                // Contenido desplazable (Bio y Cursos)
                Flexible(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Biografía / Presentación
                        Text(
                          'Presentación Académica',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.darkInk : AppTheme.ink,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                          ),
                          child: Text(
                            (bio != null && bio.trim().isNotEmpty)
                                ? bio.trim()
                                : 'Este participante aún no ha redactado una presentación académica.',
                            style: TextStyle(
                              fontSize: 12,
                              color: (bio != null && bio.trim().isNotEmpty)
                                  ? (isDark ? AppTheme.darkInk : AppTheme.ink)
                                  : (isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                              fontStyle: (bio != null && bio.trim().isNotEmpty) ? FontStyle.normal : FontStyle.italic,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Cursos Visibles
                        Row(
                          children: [
                            const Icon(Icons.school_rounded, size: 16, color: AppTheme.accent),
                            const SizedBox(width: 6),
                            Text(
                              'Cursos y Áreas Académicas',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppTheme.darkInk : AppTheme.ink,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        if (cargando)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16),
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accent),
                            ),
                          )
                        else if (ocultarCursos)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0x22F59E0B) : const Color(0x15F59E0B),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0x44F59E0B)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.lock_rounded, size: 16, color: Color(0xFFD97706)),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Este participante ha configurado sus cursos en modo privado.',
                                    style: TextStyle(fontSize: 11.5, color: Color(0xFFD97706)),
                                  ),
                                ),
                              ],
                            ),
                          )
                        else if (cursos.isEmpty)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Center(
                              child: Text(
                                'No tiene materias visibles activas actualmente.',
                                style: TextStyle(fontSize: 11.5, color: AppTheme.inkFaint),
                              ),
                            ),
                          )
                        else
                          ...cursos.map((c) {
                            final titulo = (c['titulo'] ?? 'Área Académica').toString();
                            final tipo = (c['tipo'] ?? 'CONVOCATORIA').toString();
                            final miRol = c['miRol'] as String?;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppTheme.accentSoft,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      tipo,
                                      style: const TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.accentDark,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      titulo,
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (miRol != null) ...[
                                    const SizedBox(width: 8),
                                    RoleBadge(role: miRol),
                                  ],
                                ],
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Cerrar'),
                ),
              ],
            ),
          );
        },
      );
    },
  );
}

// ==========================================
// CAMPANITA DE NOTIFICACIONES CON POLLING 45s
// ==========================================

class NotificacionBadge extends StatefulWidget {
  final VoidCallback? onNotificationTapped;

  const NotificacionBadge({super.key, this.onNotificationTapped});

  @override
  State<NotificacionBadge> createState() => _NotificacionBadgeState();
}

class _NotificacionBadgeState extends State<NotificacionBadge> {
  int _unreadCount = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetchCount();
    _timer = Timer.periodic(const Duration(seconds: 45), (_) {
      if (mounted) _fetchCount();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetchCount() async {
    final count = await ApiService.contarNotificacionesNoLeidas();
    if (mounted) {
      setState(() => _unreadCount = count);
    }
  }

  void _abrirPanelNotificaciones() {
    showLiquidGlassModalBottomSheet(
      context: context,
      maxHeightFactor: 0.80,
      builder: (ctx) => _NotificacionesSheet(
        onCountUpdated: () => _fetchCount(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_none_rounded, size: 24),
          tooltip: 'Notificaciones',
          onPressed: _abrirPanelNotificaciones,
        ),
        if (_unreadCount > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444),
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                _unreadCount > 99 ? '99+' : '$_unreadCount',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _NotificacionesSheet extends StatefulWidget {
  final VoidCallback onCountUpdated;

  const _NotificacionesSheet({required this.onCountUpdated});

  @override
  State<_NotificacionesSheet> createState() => _NotificacionesSheetState();
}

class _NotificacionesSheetState extends State<_NotificacionesSheet> {
  List<Map<String, dynamic>> _notificaciones = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() => _cargando = true);
    final notifs = await ApiService.listarNotificaciones(limite: 40);
    if (mounted) {
      setState(() {
        _notificaciones = notifs;
        _cargando = false;
      });
      widget.onCountUpdated();
    }
  }

  Future<void> _marcarLeida(Map<String, dynamic> notif) async {
    final id = (notif['id'] as num?)?.toInt();
    if (id != null && notif['leida'] != true) {
      await ApiService.marcarNotificacionLeida(id);
      setState(() {
        notif['leida'] = true;
      });
      widget.onCountUpdated();
    }
  }

  Future<void> _onTapNotificacion(Map<String, dynamic> notif) async {
    await _marcarLeida(notif);

    final tareaId = (notif['tareaId'] as num?)?.toInt();
    final tipo = notif['tipo'] as String?;

    if (tareaId != null && tareaId > 0 && mounted) {
      final navigator = Navigator.of(context);
      final messenger = ScaffoldMessenger.of(context);

      if (tipo == 'NUEVA_ENTREGA') {
        navigator.pop();
        navigator.push(
          MaterialPageRoute(
            builder: (ctx) => SpeedGraderScreen(
              tareaId: tareaId,
              onBack: () => Navigator.of(ctx).pop(),
            ),
          ),
        );
      } else {
        final tarea = await ApiService.getTareaById(tareaId);
        if (!mounted) return;
        navigator.pop();
        if (tarea != null) {
          navigator.push(
            MaterialPageRoute(
              builder: (ctx) => TareaEntregaScreen(
                tarea: tarea,
                onBack: () => Navigator.of(ctx).pop(),
              ),
            ),
          );
        } else {
          messenger.showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.danger,
              content: Text('No se pudo cargar la información de la tarea.'),
            ),
          );
        }
      }
    }
  }

  Future<void> _marcarTodasLeidas() async {
    await ApiService.marcarTodasNotificacionesLeidas();
    setState(() {
      for (final n in _notificaciones) {
        n['leida'] = true;
      }
    });
    widget.onCountUpdated();
  }

  IconData _getIcono(String? tipo) {
    switch (tipo) {
      case 'INSCRIPCION_ADMITIDA':
        return Icons.check_circle_rounded;
      case 'INSCRIPCION_RECHAZADA':
        return Icons.cancel_rounded;
      case 'NUEVA_POSTULACION':
        return Icons.person_add_rounded;
      case 'NUEVA_ENTREGA':
        return Icons.file_download_done_rounded;
      case 'ENTREGA_CALIFICADA':
        return Icons.grade_rounded;
      case 'NUEVA_TAREA':
        return Icons.assignment_rounded;
      case 'CORTE_PROXIMO':
        return Icons.timer_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _getColorIcono(String? tipo) {
    switch (tipo) {
      case 'INSCRIPCION_ADMITIDA':
      case 'ENTREGA_CALIFICADA':
        return const Color(0xFF10B981);
      case 'INSCRIPCION_RECHAZADA':
        return const Color(0xFFEF4444);
      case 'CORTE_PROXIMO':
        return const Color(0xFFF59E0B);
      case 'NUEVA_TAREA':
      case 'NUEVA_ENTREGA':
        return AppTheme.accent;
      default:
        return AppTheme.accentDark;
    }
  }

  String _formatFecha(String? fechaStr) {
    if (fechaStr == null) return '';
    try {
      final fecha = DateTime.parse(fechaStr);
      final diff = DateTime.now().difference(fecha);
      if (diff.inMinutes < 1) return 'Hace un momento';
      if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes}m';
      if (diff.inHours < 24) return 'Hace ${diff.inHours}h';
      if (diff.inDays < 7) return 'Hace ${diff.inDays}d';
      return '${fecha.day}/${fecha.month}/${fecha.year}';
    } catch (_) {
      return fechaStr.replaceFirst('T', ' ');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        // Cabecera
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.notifications_active_rounded, color: AppTheme.accent, size: 22),
                    const SizedBox(width: 8),
                    Text(
                      'Notificaciones',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: _notificaciones.any((n) => n['leida'] != true) ? _marcarTodasLeidas : null,
                  icon: const Icon(Icons.done_all_rounded, size: 16),
                  label: const Text('Marcar todas', style: TextStyle(fontSize: 12)),
                  style: TextButton.styleFrom(foregroundColor: AppTheme.accent),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Lista
          Expanded(
            child: _cargando
                ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
                : _notificaciones.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.notifications_off_outlined, size: 48, color: AppTheme.inkFaint),
                            const SizedBox(height: 12),
                            Text(
                              'No tienes notificaciones',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _cargar,
                        color: AppTheme.accent,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: _notificaciones.length,
                          separatorBuilder: (_, __) => Divider(
                            height: 1,
                            color: isDark ? AppTheme.darkLine : AppTheme.lineSoft,
                          ),
                          itemBuilder: (ctx, idx) {
                            final n = _notificaciones[idx];
                            final leida = n['leida'] == true;
                            final tipo = n['tipo'] as String?;
                            final titulo = n['titulo'] as String? ?? 'Notificación';
                            final mensaje = n['mensaje'] as String? ?? '';
                            final fecha = _formatFecha(n['createdAt'] as String?);

                            return InkWell(
                              onTap: () => _onTapNotificacion(n),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                                color: leida
                                    ? Colors.transparent
                                    : (isDark ? AppTheme.accent.withValues(alpha: 0.12) : const Color(0xFFF0FDF4)),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    CircleAvatar(
                                      radius: 18,
                                      backgroundColor: _getColorIcono(tipo).withValues(alpha: 0.18),
                                      child: Icon(
                                        _getIcono(tipo),
                                        size: 20,
                                        color: _getColorIcono(tipo),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  titulo,
                                                  style: TextStyle(
                                                    fontSize: 13,
                                                    fontWeight: leida ? FontWeight.w600 : FontWeight.bold,
                                                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                                  ),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Text(
                                                fecha,
                                                style: const TextStyle(
                                                  fontSize: 10,
                                                  color: AppTheme.inkFaint,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            mensaje,
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (!leida)
                                      Container(
                                        width: 8,
                                        height: 8,
                                        margin: const EdgeInsets.only(left: 8, top: 4),
                                        decoration: const BoxDecoration(
                                          color: AppTheme.accent,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      );
  }
}

// ==========================================
// MODAL HISTORIAL DE VERSIONES / INTENTOS
// ==========================================

void showHistorialVersionesModal(BuildContext context, {required List<Map<String, dynamic>> versiones}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;

  showLiquidGlassModalBottomSheet(
    context: context,
    maxHeightFactor: 0.75,
    builder: (ctx) => Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            children: [
              const Icon(Icons.history_rounded, color: AppTheme.accent, size: 22),
              const SizedBox(width: 8),
              Text(
                'Historial de Intentos (${versiones.length})',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppTheme.darkInk : AppTheme.ink,
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: versiones.isEmpty
              ? const Center(child: Text('No hay intentos previos registrados'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: versiones.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, idx) {
                    final v = versiones[idx];
                    final intento = v['intento'] ?? (versiones.length - idx);
                    final nombreArch = (v['nombreArchivo'] ?? 'Entrega').toString();
                    final fecha = (v['fechaEntrega'] ?? '').toString().replaceFirst('T', ' ');
                    final conRet = v['conRetraso'] == true;
                    final comentario = v['comentario'] as String?;

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: idx == 0
                              ? AppTheme.accent.withValues(alpha: 0.5)
                              : (isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppTheme.accentSoft,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'Intento #$intento',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.accentDark,
                                      ),
                                    ),
                                  ),
                                  if (idx == 0) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(5),
                                      ),
                                      child: const Text(
                                        'ÚLTIMO',
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF10B981),
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              if (conRet)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF97316).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  child: const Text(
                                    'CON RETRASO',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFFEA580C),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.attach_file_rounded, size: 16, color: AppTheme.inkFaint),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  nombreArch,
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          if (fecha.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Enviado: $fecha',
                              style: const TextStyle(fontSize: 11, color: AppTheme.inkFaint),
                            ),
                          ],
                          if (comentario != null && comentario.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Nota del alumno: "$comentario"',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontStyle: FontStyle.italic,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    ),
  );
}
