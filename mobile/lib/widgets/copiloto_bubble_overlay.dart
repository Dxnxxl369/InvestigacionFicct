import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_theme.dart';
import '../screens/copiloto/copiloto_fullscreen_screen.dart';

/// Burbuja flotante compacta estilo Binance (46x46) arrastrable con snap izquierdo/derecho.
/// Al tocarla abre el Copiloto IA a pantalla completa.
class CopilotoBubbleOverlay extends StatefulWidget {
  final String userRole;
  final String userName;
  final int? userId;
  final String rutaActual;
  final Future<void> Function(String ruta) onNavigateRoute;

  const CopilotoBubbleOverlay({
    super.key,
    required this.userRole,
    required this.userName,
    this.userId,
    required this.rutaActual,
    required this.onNavigateRoute,
  });

  @override
  State<CopilotoBubbleOverlay> createState() => _CopilotoBubbleOverlayState();
}

class _CopilotoBubbleOverlayState extends State<CopilotoBubbleOverlay> {
  static const double _bubbleSize = 46.0;
  static const double _edgeGap = 12.0;

  double? _left;
  double? _top;
  bool _dragging = false;

  String get _posKey => 'copiloto_mobile_pos_${widget.userId ?? 0}';

  @override
  void initState() {
    super.initState();
    _cargarPosicion();
  }

  Future<void> _cargarPosicion() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_posKey);
      if (raw != null && mounted) {
        final parsed = jsonDecode(raw);
        if (parsed is Map) {
          final size = MediaQuery.of(context).size;
          final side = parsed['side'] == 'left' ? 'left' : 'right';
          final savedY = (parsed['y'] as num?)?.toDouble();
          setState(() {
            _left = side == 'left'
                ? _edgeGap
                : size.width - _bubbleSize - _edgeGap;
            if (savedY != null) {
              _top = savedY.clamp(60.0, size.height - _bubbleSize - 95.0);
            }
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _guardarPosicion(String side, double y) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_posKey, jsonEncode({'side': side, 'y': y}));
    } catch (_) {}
  }

  void _abrirCopilotoFullscreen() {
    Navigator.of(context).push(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => CopilotoFullscreenScreen(
          userRole: widget.userRole,
          userName: widget.userName,
          userId: widget.userId,
          rutaActual: widget.rutaActual,
          onNavigateRoute: widget.onNavigateRoute,
        ),
        transitionsBuilder: (_, anim, __, child) {
          return SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.12),
              end: Offset.zero,
            ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOut)),
            child: FadeTransition(opacity: anim, child: child),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final currentLeft = _left ?? (size.width - _bubbleSize - _edgeGap);
    final currentTop = _top ?? (size.height - _bubbleSize - 108.0);

    return AnimatedPositioned(
      duration: _dragging ? Duration.zero : const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
      left: currentLeft,
      top: currentTop,
      child: GestureDetector(
        onPanStart: (_) => setState(() => _dragging = true),
        onPanUpdate: (details) {
          setState(() {
            _left = (currentLeft + details.delta.dx)
                .clamp(_edgeGap, size.width - _bubbleSize - _edgeGap);
            _top = (currentTop + details.delta.dy)
                .clamp(54.0, size.height - _bubbleSize - 92.0);
          });
        },
        onPanEnd: (_) {
          final centerX = (_left ?? currentLeft) + (_bubbleSize / 2);
          final side = centerX < (size.width / 2) ? 'left' : 'right';
          final snappedX =
              side == 'left' ? _edgeGap : (size.width - _bubbleSize - _edgeGap);
          final finalY = (_top ?? currentTop)
              .clamp(54.0, size.height - _bubbleSize - 92.0);

          setState(() {
            _dragging = false;
            _left = snappedX;
            _top = finalY;
          });
          _guardarPosicion(side, finalY);
        },
        onTap: _abrirCopilotoFullscreen,
        child: Container(
          width: _bubbleSize,
          height: _bubbleSize,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppTheme.accent, Color(0xFF2563EB)],
            ),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.35),
              width: 1.4,
            ),
            boxShadow: [
              BoxShadow(
                color: AppTheme.accent.withValues(alpha: 0.4),
                blurRadius: 14,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              const Icon(
                Icons.smart_toy_rounded,
                color: Colors.white,
                size: 22,
              ),
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF2563EB), width: 1.5),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
