import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/moodle_widgets.dart';

class PerfilScreen extends StatefulWidget {
  final AuthService authService;
  final VoidCallback onLogout;

  const PerfilScreen({
    super.key,
    required this.authService,
    required this.onLogout,
  });

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> {
  late TextEditingController _bioCtrl;
  bool _ocultarCursos = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final user = widget.authService.currentUser;
    _bioCtrl = TextEditingController(text: user?.descripcion ?? '');
    _ocultarCursos = user?.ocultarCursos ?? false;
  }

  Future<void> _guardarCambios() async {
    setState(() => _isLoading = true);
    await widget.authService.updateProfile(
      descripcion: _bioCtrl.text.trim(),
      ocultarCursos: _ocultarCursos,
    );
    if (mounted) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF10B981),
          content: Text('¡Perfil y preferencias actualizadas con éxito!'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.authService.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Perfil Académico'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check_rounded),
            tooltip: 'Guardar cambios',
            onPressed: _isLoading ? null : _guardarCambios,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        child: Column(
          children: [
            // Tarjeta de Avatar & Datos Generales
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        CircleAvatar(
                          radius: 44,
                          backgroundColor: AppTheme.accent,
                          child: Text(
                            user?.inicial ?? 'U',
                            style: const TextStyle(
                              fontSize: 34,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: AppTheme.accent,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      user?.nombreCompleto ?? 'Usuario',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    Text(
                      user?.email ?? '',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                      ),
                    ),
                    const SizedBox(height: 8),
                    RoleBadge(role: user?.rol ?? 'ESTUDIANTE'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Control de Privacidad Moodle (Heurística de Privacidad Moodle)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Privacidad de Cursos (Moodle)',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Controla si otros estudiantes o participantes pueden ver las áreas académicas en las que estás inscrito.',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      ),
                    ),
                    const SizedBox(height: 12),
                    MoodleSwitch(
                      value: _ocultarCursos,
                      onChanged: (val) {
                        setState(() => _ocultarCursos = val);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(val
                                ? 'Privacidad: Cursos ocultos para otros'
                                : 'Privacidad: Cursos visibles para todos'),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Biografía / Presentación Personal Editable
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Presentación & Biografía',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _bioCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Acerca de mí / Líneas de Investigación',
                        hintText: 'Trayectoria académica, proyectos...',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Datos Legales Institucionales Bloqueados (Heurística 5: Prevención de Errores)
            Card(
              color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.lock_rounded, size: 16, color: AppTheme.seal),
                        const SizedBox(width: 8),
                        Text(
                          'Datos Legales Protegidos (Solo Lectura)',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.darkInk : AppTheme.ink,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Los datos legales (nombre, correo institucional y rol) se encuentran validados institucionalmente y no pueden ser alterados.',
                      style: TextStyle(fontSize: 11, color: AppTheme.inkFaint),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      enabled: false,
                      controller: TextEditingController(text: user?.nombreCompleto),
                      decoration: const InputDecoration(
                        labelText: 'Nombre Legal',
                        suffixIcon: Icon(Icons.lock_outline_rounded, size: 16),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      enabled: false,
                      controller: TextEditingController(text: user?.email),
                      decoration: const InputDecoration(
                        labelText: 'Correo Institucional',
                        suffixIcon: Icon(Icons.lock_outline_rounded, size: 16),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Botón de Cerrar Sesión
            OutlinedButton.icon(
              icon: const Icon(Icons.logout_rounded, color: AppTheme.danger),
              label: const Text('Cerrar Sesión', style: TextStyle(color: AppTheme.danger)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.dangerSoft),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: widget.onLogout,
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}
