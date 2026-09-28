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
import 'convocatorias/convocatorias_screen.dart';
import 'convocatorias/convocatoria_detalle_screen.dart';
import 'convocatorias/crear_convocatoria_screen.dart';
import 'documentos/documentos_screen.dart';
import 'perfil/perfil_screen.dart';

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

  // Sub-pantallas activas
  ConvocatoriaModel? _activeAulaCurso;
  TareaModel? _activeTarea;
  bool _speedGraderOpen = false;
  ConvocatoriaModel? _activeConvocatoriaDetalle;
  bool _crearConvocatoriaOpen = false;

  void _onTabTapped(int index) {
    setState(() {
      _currentTab = index;
      // Cerrar sub-pantallas al cambiar de pestaña principal
      _activeAulaCurso = null;
      _activeTarea = null;
      _speedGraderOpen = false;
      _activeConvocatoriaDetalle = null;
      _crearConvocatoriaOpen = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Si SpeedGrader está abierto, se muestra a pantalla completa
    if (_speedGraderOpen) {
      return SpeedGraderScreen(
        onBack: () => setState(() => _speedGraderOpen = false),
      );
    }

    // Si hay una entrega de tarea activa
    if (_activeTarea != null) {
      return TareaEntregaScreen(
        tarea: _activeTarea!,
        onBack: () => setState(() => _activeTarea = null),
      );
    }

    // Si hay un aula virtual de curso abierta
    if (_activeAulaCurso != null) {
      return AulaVirtualScreen(
        curso: _activeAulaCurso!,
        onBack: () => setState(() => _activeAulaCurso = null),
        onOpenTarea: (t) => setState(() => _activeTarea = t),
        onOpenSpeedGrader: () => setState(() => _speedGraderOpen = true),
      );
    }

    // Si hay detalle de convocatoria abierto
    if (_activeConvocatoriaDetalle != null) {
      return ConvocatoriaDetalleScreen(
        convocatoria: _activeConvocatoriaDetalle!,
        onBack: () => setState(() => _activeConvocatoriaDetalle = null),
      );
    }

    // Si está abierta la pantalla de crear convocatoria
    if (_crearConvocatoriaOpen) {
      return CrearConvocatoriaScreen(
        onBack: () => setState(() => _crearConvocatoriaOpen = false),
      );
    }

    Widget currentBody;
    switch (_currentTab) {
      case 0:
        currentBody = DashboardScreen(
          authService: widget.authService,
          onNavigateTab: _onTabTapped,
          onOpenSpeedGrader: () => setState(() => _speedGraderOpen = true),
          onOpenTarea: () => setState(() {
            _activeTarea = TareaModel(
              id: 201,
              titulo: 'Tarea: Planteamiento del Problema',
              descripcion: 'Subir en PDF el árbol de problemas y marco de justificación técnica.',
              fechaLimite: '30 Septiembre 23:59',
            );
          }),
        );
        break;
      case 1:
        currentBody = MisAreasScreen(
          onOpenAula: (curso) => setState(() => _activeAulaCurso = curso),
        );
        break;
      case 2:
        currentBody = ConvocatoriasScreen(
          onOpenDetalle: (conv) => setState(() => _activeConvocatoriaDetalle = conv),
          onNuevaConvocatoria: () => setState(() => _crearConvocatoriaOpen = true),
        );
        break;
      case 3:
        currentBody = const DocumentosScreen();
        break;
      case 4:
        currentBody = PerfilScreen(
          authService: widget.authService,
          onLogout: widget.onLogout,
        );
        break;
      default:
        currentBody = const SizedBox.shrink();
    }

    return Scaffold(
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
    );
  }
}
