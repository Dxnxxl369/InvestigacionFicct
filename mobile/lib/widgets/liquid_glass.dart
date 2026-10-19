import 'dart:ui';
import 'package:flutter/material.dart';
import '../config/app_theme.dart';

/// Contenedor con efecto Liquid Glass / Frosted Glass / Backdrop Blur
/// inspirado en la estética moderna de la plataforma web FICCT.
class LiquidGlassContainer extends StatelessWidget {
  final Widget child;
  final double blur;
  final double borderRadius;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Border? border;
  final double? width;
  final double? height;
  final Color? color;
  final List<BoxShadow>? boxShadow;
  final Clip clipBehavior;

  const LiquidGlassContainer({
    super.key,
    required this.child,
    this.blur = 20.0,
    this.borderRadius = 20.0,
    this.padding,
    this.margin,
    this.border,
    this.width,
    this.height,
    this.color,
    this.boxShadow,
    this.clipBehavior = Clip.antiAlias,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final defaultBg = isDark
        ? const Color(0xC70D1C33)
        : const Color(0xD9FFFFFF);

    final defaultBorder = border ??
        Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.12)
              : Colors.white.withValues(alpha: 0.65),
          width: 1.2,
        );

    final defaultShadow = boxShadow ??
        [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.45)
                : const Color(0xFF16243D).withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ];

    Widget content = Container(
      width: width,
      height: height,
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? defaultBg,
        borderRadius: BorderRadius.circular(borderRadius),
        border: defaultBorder,
        boxShadow: defaultShadow,
      ),
      child: child,
    );

    if (margin != null) {
      content = Padding(padding: margin!, child: content);
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      clipBehavior: clipBehavior,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: content,
      ),
    );
  }
}

/// Helper universal para abrir Bottom Sheets con efecto Liquid Glass / Frosted Glass
Future<T?> showLiquidGlassModalBottomSheet<T>({
  required BuildContext context,
  required Widget Function(BuildContext) builder,
  bool isScrollControlled = true,
  double maxHeightFactor = 0.88,
  bool enableDrag = true,
  bool isDismissible = true,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;

  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: isScrollControlled,
    enableDrag: enableDrag,
    isDismissible: isDismissible,
    backgroundColor: Colors.transparent,
    barrierColor: isDark
        ? Colors.black.withValues(alpha: 0.65)
        : const Color(0xFF0B2545).withValues(alpha: 0.35),
    builder: (ctx) {
      final size = MediaQuery.of(ctx).size;

      return ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: size.height * maxHeightFactor,
            ),
            decoration: BoxDecoration(
              color: isDark
                  ? const Color(0xE80D1C33)
                  : const Color(0xF2FFFFFF),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.14)
                    : Colors.white.withValues(alpha: 0.8),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: isDark
                      ? Colors.black.withValues(alpha: 0.5)
                      : const Color(0xFF0B2545).withValues(alpha: 0.15),
                  blurRadius: 32,
                  offset: const Offset(0, -6),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Indicador de arrastre (drag handle)
                Container(
                  width: 44,
                  height: 4.5,
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.22)
                        : AppTheme.line.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                Flexible(child: builder(ctx)),
              ],
            ),
          ),
        ),
      );
    },
  );
}

/// Helper universal para abrir Diálogos con efecto Liquid Glass / Frosted Glass
Future<T?> showLiquidGlassDialog<T>({
  required BuildContext context,
  required Widget Function(BuildContext) builder,
  bool barrierDismissible = true,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;

  return showDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    barrierColor: isDark
        ? Colors.black.withValues(alpha: 0.65)
        : const Color(0xFF0B2545).withValues(alpha: 0.35),
    builder: (ctx) {
      return Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: LiquidGlassContainer(
          borderRadius: 24,
          blur: 24,
          padding: const EdgeInsets.all(20),
          child: builder(ctx),
        ),
      );
    },
  );
}
