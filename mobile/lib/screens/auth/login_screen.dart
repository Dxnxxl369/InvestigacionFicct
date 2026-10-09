import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../config/constants.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../services/fcm_service.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

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
  String _currentServer = ApiService.baseUrl;
  bool? _connectionSuccess;

  @override
  void initState() {
    super.initState();
    _checkServer();
  }

  Future<void> _checkServer() async {
    final ok = await ApiService.testConnection();
    if (mounted) {
      setState(() {
        _currentServer = ApiService.baseUrl;
        _connectionSuccess = ok;
      });
    }
  }

  Future<void> _handleLogin([String? email, String? pass]) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final targetEmail = email ?? _emailCtrl.text;
    final targetPass = pass ?? _passCtrl.text;

    if (FcmService.currentToken == null) {
      try {
        FcmService.currentToken = await FirebaseMessaging.instance.getToken().timeout(const Duration(seconds: 3));
      } catch (_) {}
    }

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

  void _showServerDialog() {
    final ipCtrl = TextEditingController(text: _currentServer);
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.dns_rounded, color: AppTheme.accent),
              SizedBox(width: 8),
              Text('Servidor Backend', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Dirección IP del servidor universitario (editable):',
                  style: TextStyle(fontSize: 12),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: ipCtrl,
                  decoration: const InputDecoration(
                    labelText: 'URL API',
                    hintText: 'http://192.168.3.42:8080/api',
                    prefixIcon: Icon(Icons.link_rounded),
                  ),
                ),
                const SizedBox(height: 14),
                const Text('Opciones rápidas:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    ActionChip(
                      avatar: const Icon(Icons.cloud_done_rounded, size: 14, color: AppTheme.accent),
                      label: const Text('Nube Render (Producción)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      onPressed: () => ipCtrl.text = AppConstants.apiBaseUrlCloud,
                    ),
                    ActionChip(
                      label: const Text('Wi-Fi Actual (192.168.3.42)', style: TextStyle(fontSize: 11)),
                      onPressed: () => ipCtrl.text = 'http://192.168.3.42:8080/api',
                    ),
                    ActionChip(
                      label: const Text('Wi-Fi Alternativa (192.168.0.15)', style: TextStyle(fontSize: 11)),
                      onPressed: () => ipCtrl.text = 'http://192.168.0.15:8080/api',
                    ),
                    ActionChip(
                      label: const Text('Localhost (Desktop/Web)', style: TextStyle(fontSize: 11)),
                      onPressed: () => ipCtrl.text = AppConstants.apiBaseUrlWeb,
                    ),
                    ActionChip(
                      label: const Text('Emulador Android (10.0.2.2)', style: TextStyle(fontSize: 11)),
                      onPressed: () => ipCtrl.text = AppConstants.apiBaseUrlEmulator,
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () async {
                final newUrl = ipCtrl.text.trim();
                if (newUrl.isNotEmpty) {
                  Navigator.pop(ctx);
                  await ApiService.setBaseUrl(newUrl);
                  final ok = await ApiService.testConnection();
                  if (mounted) {
                    setState(() {
                      _currentServer = ApiService.baseUrl;
                      _connectionSuccess = ok;
                    });
                  }
                }
              },
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );
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
              const SizedBox(height: 10),
              // Barra de Servidor: Botón directo de Nube y configuración
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Botón directo a Nube Render
                  InkWell(
                    onTap: () async {
                      final messenger = ScaffoldMessenger.of(context);
                      await StorageService.saveServerUrl(AppConstants.apiBaseUrlCloud);
                      await ApiService.initBaseUrl();
                      await _checkServer();
                      if (!mounted) return;
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text('✓ Conectado al Servidor en la Nube (Render)'),
                          backgroundColor: AppTheme.accent,
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: _currentServer.contains('onrender.com')
                            ? AppTheme.accent.withValues(alpha: 0.15)
                            : (isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _currentServer.contains('onrender.com')
                              ? AppTheme.accent
                              : (isDark ? AppTheme.darkLine : AppTheme.line),
                          width: _currentServer.contains('onrender.com') ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.cloud_done_rounded,
                            size: 14,
                            color: _currentServer.contains('onrender.com') ? AppTheme.accent : AppTheme.inkFaint,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            _currentServer.contains('onrender.com') ? '☁️ Nube Activa' : '☁️ Usar Nube',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _currentServer.contains('onrender.com') ? AppTheme.accent : (isDark ? AppTheme.darkInk : AppTheme.ink),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Indicador actual con opción de editar IP
                  InkWell(
                    onTap: _showServerDialog,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: _connectionSuccess == true
                            ? AppTheme.accent.withValues(alpha: 0.12)
                            : AppTheme.dangerSoft,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _connectionSuccess == true
                              ? AppTheme.accent
                              : AppTheme.danger.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _connectionSuccess == true ? Icons.check_circle_rounded : Icons.sync_problem_rounded,
                            size: 13,
                            color: _connectionSuccess == true ? AppTheme.accent : AppTheme.danger,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            _currentServer.contains('onrender.com')
                                ? 'ficct-backend'
                                : _currentServer.replaceAll('http://', '').replaceAll('/api', ''),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: _connectionSuccess == true
                                  ? (isDark ? Colors.white : AppTheme.primary)
                                  : AppTheme.danger,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.settings, size: 12, color: Colors.grey),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Logo FICCT y Escudo
              Center(
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    color: AppTheme.accentSoft,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3), width: 2),
                  ),
                  child: const Icon(
                    Icons.school_rounded,
                    color: AppTheme.accent,
                    size: 40,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'FICCT Móvil',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
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
              const SizedBox(height: 26),

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
              const SizedBox(height: 18),

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
              const SizedBox(height: 24),

              // Acceso Rápido con Cuentas Reales de la BD PostgreSQL
              Text(
                'ACCESO RÁPIDO INSTITUCIONAL:',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                ),
              ),
              const SizedBox(height: 10),

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
                      onPressed: () => _handleLogin('daniel.quispe@uagrm.edu.bo', 'estudiante123'),
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
                      onPressed: () => _handleLogin('cfernandez@uagrm.edu.bo', 'jurado123'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.admin_panel_settings_outlined, size: 16),
                      label: const Text('Admin', style: TextStyle(fontSize: 12)),
                      onPressed: () => _handleLogin('admin@uagrm.edu.bo', 'admin369'),
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
