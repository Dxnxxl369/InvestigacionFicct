import 'package:flutter/material.dart';
import '../models/convocatoria_model.dart';
import '../models/tarea_model.dart';
import '../services/auth_service.dart';
import '../widgets/liquid_navbar.dart';
import 'dashboard/dashboard_screen.dart';
import 'moodle/mis_areas_screen.dart';
import 'moodle/aula_virtual_screen.dart';
import 'moodle/tarea_entrega_screen.dart';
import 'moodle/speedgrader_screen.dart';
import 'moodle/mis_pendientes_screen.dart';
import 'convocatorias/convocatorias_screen.dart';
import 'convocatorias/convocatoria_detalle_screen.dart';
import 'convocatorias/crear_convocatoria_screen.dart';
import 'documentos/documentos_screen.dart';
import 'perfil/perfil_screen.dart';
import '../config/app_theme.dart';

class MainScaffold extends StatefulWidget {
  final AuthService authService;
  final VoidCallback onLogout;
  final VoidCallback onToggleTheme;

  const MainScaffold({
    super.key,
    required this.authService,
    required this.onLogout,
    required this.onToggleTheme,
  });

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentTab = 0;

  void _onTabTapped(int index) {
    setState(() {
      _currentTab = index;
    });
  }

  // Navegación nativa con Navigator.push para preservar el historial completo y botón atrás de Android
  void _abrirAula(ConvocatoriaModel curso) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => AulaVirtualScreen(
          curso: curso,
          onBack: () => Navigator.of(ctx).pop(),
          onOpenTarea: _abrirTarea,
          onOpenSpeedGrader: (int tareaId) => _abrirSpeedGrader(tareaId: tareaId),
        ),
      ),
    );
  }

  void _abrirTarea(TareaModel tarea) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => TareaEntregaScreen(
          tarea: tarea,
          onBack: () => Navigator.of(ctx).pop(),
        ),
      ),
    );
  }

  void _abrirMisPendientes() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => MisPendientesScreen(
          onBack: () => Navigator.of(ctx).pop(),
        ),
      ),
    );
  }

  void _abrirSpeedGrader({int? tareaId}) {
    if (tareaId == null) {
      _onTabTapped(1); // Redirigir a Mis Áreas para elegir materia y tarea real
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Ingresa a un área para calificar una tarea específica.'),
          backgroundColor: AppTheme.seal,
        ),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => SpeedGraderScreen(
          tareaId: tareaId,
          onBack: () => Navigator.of(ctx).pop(),
        ),
      ),
    );
  }

  void _abrirConvocatoriaDetalle(ConvocatoriaModel conv) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => ConvocatoriaDetalleScreen(
          convocatoria: conv,
          onBack: () => Navigator.of(ctx).pop(),
          onOpenAula: _abrirAula,
        ),
      ),
    );
  }

  void _abrirCrearConvocatoria() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => CrearConvocatoriaScreen(
          onBack: () => Navigator.of(ctx).pop(),
        ),
      ),
    );
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    Widget currentBody;
    switch (_currentTab) {
      case 0:
        currentBody = DashboardScreen(
          authService: widget.authService,
          onNavigateTab: _onTabTapped,
          onOpenSpeedGrader: () => _abrirSpeedGrader(),
          onOpenAula: _abrirAula,
          onOpenMisPendientes: _abrirMisPendientes,
          onToggleTheme: widget.onToggleTheme,
        );
        break;
      case 1:
        currentBody = MisAreasScreen(
          onOpenAula: _abrirAula,
        );
        break;
      case 2:
        currentBody = ConvocatoriasScreen(
          onOpenDetalle: _abrirConvocatoriaDetalle,
          onNuevaConvocatoria: _abrirCrearConvocatoria,
        );
        break;
      case 3:
        currentBody = const DocumentosScreen();
        break;
      case 4:
        currentBody = PerfilScreen(
          authService: widget.authService,
          onLogout: widget.onLogout,
          onToggleTheme: widget.onToggleTheme,
        );
        break;
      default:
        currentBody = const SizedBox.shrink();
    }

    // PopScope asegura que si el usuario está en otra pestaña y presiona atrás, regrese al Inicio antes de salir
    return PopScope(
      canPop: _currentTab == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _currentTab != 0) {
          setState(() => _currentTab = 0);
        }
      },
      child: Scaffold(
        body: Stack(
          children: [
            currentBody,
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: LiquidNavbar(
                currentIndex: _currentTab,
                onTap: _onTabTapped,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
