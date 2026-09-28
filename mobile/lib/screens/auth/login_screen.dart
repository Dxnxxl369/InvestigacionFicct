import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  final AuthService authService;
  final VoidCallback onLoginSuccess;

  const LoginScreen({
    super.key,
    required this.authService,
    required this.onLoginSuccess,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController(text: 'rmartinez@uagrm.edu.bo');
  final _passCtrl = TextEditingController(text: 'docente123');
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin([String? email, String? pass]) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final targetEmail = email ?? _emailCtrl.text;
    final targetPass = pass ?? _passCtrl.text;

    final ok = await widget.authService.login(targetEmail, targetPass);

    if (mounted) {
      setState(() => _isLoading = false);
      if (ok) {
        widget.onLoginSuccess();
      } else {
        setState(() => _errorMessage = 'Credenciales incorrectas o servidor no disponible.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              // Logo FICCT y Escudo
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppTheme.accentSoft,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3), width: 2),
                  ),
                  child: const Icon(
                    Icons.school_rounded,
                    color: AppTheme.accent,
                    size: 42,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'FICCT Móvil',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Playfair Display',
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppTheme.darkInk : AppTheme.ink,
                ),
              ),
              Text(
                'Sistema de Investigación & Aulas Moodle',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                ),
              ),
              const SizedBox(height: 32),

              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.dangerSoft,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: AppTheme.danger, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: AppTheme.danger, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),

              // Inputs de Login
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Correo Institucional',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _passCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Contraseña',
                  prefixIcon: Icon(Icons.lock_outline_rounded),
                ),
              ),
              const SizedBox(height: 20),

              ElevatedButton(
                onPressed: _isLoading ? null : () => _handleLogin(),
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Iniciar Sesión'),
              ),
              const SizedBox(height: 28),

              // Acceso Rápido con Cuentas de Prueba (Heurística 7: Flexibilidad)
              Text(
                'ACCESO RÁPIDO DE PRUEBA (1 TOQUE):',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                ),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.badge_rounded, size: 16),
                      label: const Text('Docente', style: TextStyle(fontSize: 12)),
                      onPressed: () => _handleLogin('rmartinez@uagrm.edu.bo', 'docente123'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.school_outlined, size: 16),
                      label: const Text('Estudiante', style: TextStyle(fontSize: 12)),
                      onPressed: () => _handleLogin('cmendez@uagrm.edu.bo', 'estudiante123'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.gavel_rounded, size: 16),
                      label: const Text('Jurado', style: TextStyle(fontSize: 12)),
                      onPressed: () => _handleLogin('jcabrera@uagrm.edu.bo', 'jurado123'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.admin_panel_settings_outlined, size: 16),
                      label: const Text('Admin', style: TextStyle(fontSize: 12)),
                      onPressed: () => _handleLogin('admin@ficct.uagrm.edu.bo', 'admin123'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
