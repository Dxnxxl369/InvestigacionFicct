import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import 'liquid_glass.dart';

enum TipoEliminacion { tarea, modulo, convocatoria }

class ConfirmarEliminacionDialog extends StatefulWidget {
  final TipoEliminacion tipo;
  final String titulo;
  final int totalEntregas;
  final int totalParticipantes;
  final int totalTareas;
  final VoidCallback onConfirmar;
  final VoidCallback? onArchivar;
  final bool loading;

  const ConfirmarEliminacionDialog({
    super.key,
    required this.tipo,
    required this.titulo,
    this.totalEntregas = 0,
    this.totalParticipantes = 0,
    this.totalTareas = 0,
    required this.onConfirmar,
    this.onArchivar,
    this.loading = false,
  });

  static Future<void> mostrar({
    required BuildContext context,
    required TipoEliminacion tipo,
    required String titulo,
    int totalEntregas = 0,
    int totalParticipantes = 0,
    int totalTareas = 0,
    required VoidCallback onConfirmar,
    VoidCallback? onArchivar,
  }) {
    return showLiquidGlassDialog(
      context: context,
      builder: (ctx) => ConfirmarEliminacionDialog(
        tipo: tipo,
        titulo: titulo,
        totalEntregas: totalEntregas,
        totalParticipantes: totalParticipantes,
        totalTareas: totalTareas,
        onConfirmar: () {
          Navigator.of(ctx).pop();
          onConfirmar();
        },
        onArchivar: onArchivar != null
            ? () {
                Navigator.of(ctx).pop();
                onArchivar();
              }
            : null,
      ),
    );
  }

  @override
  State<ConfirmarEliminacionDialog> createState() => _ConfirmarEliminacionDialogState();
}

class _ConfirmarEliminacionDialogState extends State<ConfirmarEliminacionDialog> {
  final TextEditingController _confirmController = TextEditingController();
  bool _confirmado = false;

  @override
  void dispose() {
    _confirmController.dispose();
    super.dispose();
  }

  String get _tipoNombre {
    switch (widget.tipo) {
      case TipoEliminacion.tarea:
        return 'la tarea';
      case TipoEliminacion.modulo:
        return 'el módulo';
      case TipoEliminacion.convocatoria:
        return 'el aula o convocatoria';
    }
  }

  bool get _requiereTextoConfirmacion {
    if (widget.tipo == TipoEliminacion.tarea && widget.totalEntregas > 0) return true;
    if (widget.tipo == TipoEliminacion.convocatoria &&
        (widget.totalParticipantes > 0 || widget.totalTareas > 0)) {
      return true;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final puedeEjecutar = !_requiereTextoConfirmacion || _confirmado;

    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Cabecera
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.danger.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.delete_outline_rounded, color: AppTheme.danger, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Confirmar eliminación',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Acción sobre $_tipoNombre',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Mensaje
          Text(
            '¿Está seguro de que desea eliminar definitivamente "${widget.titulo}"?',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),

          // Advertencia Tarea con entregas
          if (widget.tipo == TipoEliminacion.tarea && widget.totalEntregas > 0) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.danger.withValues(alpha: 0.25)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, size: 16, color: AppTheme.danger),
                      const SizedBox(width: 6),
                      Text(
                        'Atención: ${widget.totalEntregas} entrega(s) registrada(s)',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.danger,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Se eliminarán de forma irreversible todos los archivos enviados por estudiantes, rúbricas y calificaciones asociadas.',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Nota informativa Módulo
          if (widget.tipo == TipoEliminacion.modulo) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.withValues(alpha: 0.25)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Preservación de contenido:',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Colors.blue),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Las tareas vinculadas a este módulo pasarán automáticamente a la lista de tareas generales del área sin módulo asignado.',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Advertencia Convocatoria
          if (widget.tipo == TipoEliminacion.convocatoria) ...[
            if (widget.totalParticipantes > 0 || widget.totalTareas > 0) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.danger.withValues(alpha: 0.25)),
                ),
                child: Text(
                  'El área cuenta con ${widget.totalParticipantes} participante(s) y ${widget.totalTareas} tarea(s). La eliminación definitiva borrará todos los registros del aula.',
                  style: const TextStyle(fontSize: 11.5, color: AppTheme.danger, height: 1.3),
                ),
              ),
              const SizedBox(height: 10),
            ],
            if (widget.onArchivar != null) ...[
              OutlinedButton.icon(
                onPressed: widget.onArchivar,
                icon: const Icon(Icons.archive_outlined, size: 16),
                label: const Text('Archivar área en su lugar', style: TextStyle(fontSize: 12)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ],

          // Campo de texto de confirmación estricta
          if (_requiereTextoConfirmacion) ...[
            Text(
              'Escriba ELIMINAR para habilitar la confirmación:',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _confirmController,
              onChanged: (val) {
                setState(() {
                  _confirmado = val.trim().toUpperCase() == 'ELIMINAR';
                });
              },
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                hintText: 'ELIMINAR',
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                isDense: true,
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Botones de acción
          Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancelar'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: puedeEjecutar ? widget.onConfirmar : null,
                  icon: const Icon(Icons.delete_forever_rounded, size: 16),
                  label: const Text('Eliminar', style: TextStyle(fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.danger,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppTheme.danger.withValues(alpha: 0.3),
                    disabledForegroundColor: Colors.white.withValues(alpha: 0.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 11),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
