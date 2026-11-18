import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_theme.dart';
import '../screens/copiloto/copiloto_fullscreen_screen.dart';

/// Burbuja flotante compacta estilo Binance (46x46) arrastrable a 60/120fps sin delay,
/// usando ValueNotifier + RepaintBoundary y AnimationController para imantar al borde.
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

class _CopilotoBubbleOverlayState extends State<CopilotoBubbleOverlay>
    with SingleTickerProviderStateMixin {
  static const double _bubbleSize = 46.0;
  static const double _edgeGap = 12.0;

  late final ValueNotifier<Offset?> _posNotifier;
  late final AnimationController _snapCtrl;
  Animation<Offset>? _snapAnim;

  String get _posKey => 'copiloto_mobile_pos_${widget.userId ?? 0}';

  @override
  void initState() {
    super.initState();
    _posNotifier = ValueNotifier<Offset?>(null);
    _snapCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    )..addListener(() {
        if (_snapAnim != null) {
          _posNotifier.value = _snapAnim!.value;
        }
      });
    _cargarPosicion();
  }

  @override
  void dispose() {
    _snapCtrl.dispose();
    _posNotifier.dispose();
    super.dispose();
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
          final x = side == 'left'
              ? _edgeGap
              : size.width - _bubbleSize - _edgeGap;
          final y = (savedY ?? (size.height - _bubbleSize - 108.0))
              .clamp(54.0, size.height - _bubbleSize - 92.0);
          _posNotifier.value = Offset(x, y);
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
    final defaultOffset = Offset(
      size.width - _bubbleSize - _edgeGap,
      size.height - _bubbleSize - 108.0,
    );

    final bubbleWidget = RepaintBoundary(
      child: GestureDetector(
        onPanStart: (_) => _snapCtrl.stop(),
        onPanUpdate: (details) {
          final curr = _posNotifier.value ?? defaultOffset;
          final nextX = (curr.dx + details.delta.dx)
              .clamp(_edgeGap, size.width - _bubbleSize - _edgeGap);
          final nextY = (curr.dy + details.delta.dy)
              .clamp(54.0, size.height - _bubbleSize - 92.0);
          _posNotifier.value = Offset(nextX, nextY);
        },
        onPanEnd: (_) {
          final curr = _posNotifier.value ?? defaultOffset;
          final centerX = curr.dx + (_bubbleSize / 2);
          final side = centerX < (size.width / 2) ? 'left' : 'right';
          final snappedX =
              side == 'left' ? _edgeGap : (size.width - _bubbleSize - _edgeGap);
          final finalY = curr.dy.clamp(54.0, size.height - _bubbleSize - 92.0);
          final target = Offset(snappedX, finalY);

          _snapAnim = Tween<Offset>(begin: curr, end: target).animate(
            CurvedAnimation(parent: _snapCtrl, curve: Curves.easeOutCubic),
          );
          _snapCtrl.forward(from: 0);
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
                color: AppTheme.accent.withValues(alpha: 0.38),
                blurRadius: 12,
                offset: const Offset(0, 4),
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

    return ValueListenableBuilder<Offset?>(
      valueListenable: _posNotifier,
      child: bubbleWidget,
      builder: (_, offset, child) {
        final pos = offset ?? defaultOffset;
        return Positioned(
          left: pos.dx,
          top: pos.dy,
          child: child!,
        );
      },
    );
  }
}
