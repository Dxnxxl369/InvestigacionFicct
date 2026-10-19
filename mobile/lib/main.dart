import 'package:flutter/material.dart';
import 'config/app_theme.dart';
import 'services/auth_service.dart';
import 'services/storage_service.dart';
import 'services/api_service.dart';
import 'services/fcm_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/main_scaffold.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();
  await ApiService.initBaseUrl();
  await FcmService.initialize();
  runApp(const FicctMobileApp());
}

class FicctMobileApp extends StatefulWidget {
  const FicctMobileApp({super.key});

  @override
  State<FicctMobileApp> createState() => _FicctMobileAppState();
}

class _FicctMobileAppState extends State<FicctMobileApp> {
  final AuthService _authService = AuthService();
  ThemeMode _themeMode = ThemeMode.light;

  void _toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _authService,
      builder: (context, _) {
        return MaterialApp(
          title: 'FICCT Móvil',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: _themeMode,
          home: _authService.isLoading
              ? const Scaffold(
                  body: Center(
                    child: CircularProgressIndicator(color: AppTheme.accent),
                  ),
                )
              : _authService.isAuthenticated
                  ? MainScaffold(
                      authService: _authService,
                      onLogout: () => _authService.logout(),
                      onToggleTheme: _toggleTheme,
                    )
                  : LoginScreen(
                      authService: _authService,
                      onLoginSuccess: () => setState(() {}),
                    ),
        );
      },
    );
  }
}
