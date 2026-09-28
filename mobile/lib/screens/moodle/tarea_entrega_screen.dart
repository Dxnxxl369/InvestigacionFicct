import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/tarea_model.dart';
import '../../services/storage_service.dart';

class TareaEntregaScreen extends StatefulWidget {
  final TareaModel tarea;
  final VoidCallback onBack;

  const TareaEntregaScreen({
    super.key,
    required this.tarea,
    required this.onBack,
  });

  @override
  State<TareaEntregaScreen> createState() => _TareaEntregaScreenState();
}

class _TareaEntregaScreenState extends State<TareaEntregaScreen> {
  String? _archivoNombre;
  String _estadoEntrega = 'SIN_ENTREGAR';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadDraft();
  }

  Future<void> _loadDraft() async {
    final draft = await StorageService.getTaskDraft(widget.tarea.id);
    if (draft != null && mounted) {
      setState(() {
        _archivoNombre = draft['archivoNombre'] as String?;
        _estadoEntrega = draft['estado'] as String? ?? 'BORRADOR';
      });
    }
  }

  void _adjuntarArchivoSimulado() {
    setState(() {
      _archivoNombre = 'Avance_Capitulo_1_vfinal.pdf';
      _estadoEntrega = 'BORRADOR';
    });
    StorageService.saveTaskDraft(widget.tarea.id, {
      'archivoNombre': _archivoNombre,
      'estado': 'BORRADOR',
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Documento cargado al borrador local (LocalStorage)')),
    );
  }

  void _eliminarArchivo() {
    setState(() {
      _archivoNombre = null;
      _estadoEntrega = 'SIN_ENTREGAR';
    });
    StorageService.removeTaskDraft(widget.tarea.id);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Borrador eliminado')),
    );
  }

  void _showRenombrarDialog() {
    final ctrl = TextEditingController(text: _archivoNombre);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Guardar Archivo Como (Moodle)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Edita el nombre visible de tu entrega académica:',
              style: TextStyle(fontSize: 12, color: AppTheme.inkSoft),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: ctrl,
              decoration: const InputDecoration(labelText: 'Nombre del archivo'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              if (ctrl.text.isNotEmpty) {
                setState(() => _archivoNombre = ctrl.text.trim());
                StorageService.saveTaskDraft(widget.tarea.id, {
                  'archivoNombre': _archivoNombre,
                  'estado': _estadoEntrega,
                });
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Nombre de entrega actualizado')),
                );
              }
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmarEntrega() async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 600));

    setState(() {
      _estadoEntrega = 'ENTREGADO';
      _isLoading = false;
    });

    await StorageService.saveTaskDraft(widget.tarea.id, {
      'archivoNombre': _archivoNombre,
      'estado': 'ENTREGADO',
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF10B981),
          content: Text('¡Entrega definitiva registrada con éxito en el aula Moodle!'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: widget.onBack,
        ),
        title: const Text('Entrega de Tarea'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Detalles de la Tarea
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.accentSoft,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Módulo 1: Perfil de Proyecto',
                        style: TextStyle(color: AppTheme.accentDark, fontSize: 10.5, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.tarea.titulo,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      widget.tarea.descripcion,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Fechas Moodle
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                      ),
                      child: Column(
                        children: [
                          _DateRow(
                            label: 'Estado de entrega:',
                            value: _estadoEntrega == 'ENTREGADO'
                                ? 'Entregado para calificar'
                                : (_archivoNombre != null ? 'Borrador (No enviado)' : 'Sin entregar'),
                            valueColor: _estadoEntrega == 'ENTREGADO'
                                ? const Color(0xFF10B981)
                                : (_archivoNombre != null ? AppTheme.seal : AppTheme.danger),
                          ),
                          const SizedBox(height: 6),
                          _DateRow(
                            label: 'Fecha límite:',
                            value: widget.tarea.fechaLimite ?? '30 Septiembre 23:59',
                          ),
                          const SizedBox(height: 6),
                          const _DateRow(
                            label: 'Tiempo restante:',
                            value: '3 días 14 horas',
                            valueColor: Color(0xFF10B981),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Zona Drag & Drop / Subida de Archivo Moodle
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Archivos de la Entrega (Moodle)',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    Text(
                      'Formatos: ${widget.tarea.tiposPermitidos ?? ".pdf, .docx"} • Máx: ${widget.tarea.tamanoMaximoMb} MB',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                      ),
                    ),
                    const SizedBox(height: 12),

                    if (_archivoNombre == null)
                      InkWell(
                        onTap: _adjuntarArchivoSimulado,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                          decoration: BoxDecoration(
                            color: AppTheme.accentSoft.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.accent, width: 1.5),
                          ),
                          child: Column(
                            children: [
                              const Icon(Icons.cloud_upload_outlined, size: 36, color: AppTheme.accent),
                              const SizedBox(height: 6),
                              const Text(
                                'Toca para seleccionar archivo',
                                style: TextStyle(
                                  color: AppTheme.accentDark,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                'o arrastra y suelta aquí tu documento',
                                style: TextStyle(
                                  color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.accentSoft,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppTheme.accent.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.picture_as_pdf_rounded, color: AppTheme.danger, size: 28),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _archivoNombre!,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12.5,
                                      color: AppTheme.accentDark,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const Text(
                                    '2.1 MB • Guardado en borrador local',
                                    style: TextStyle(fontSize: 10.5, color: AppTheme.inkFaint),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 20),
                              tooltip: 'Renombrar (Guardar como...)',
                              onPressed: _showRenombrarDialog,
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.danger, size: 20),
                              tooltip: 'Eliminar',
                              onPressed: _eliminarArchivo,
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.save_outlined, size: 14, color: AppTheme.inkFaint),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'El archivo se preserva automáticamente en tu dispositivo.',
                            style: TextStyle(
                              fontSize: 10.5,
                              color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    ElevatedButton(
                      onPressed: _archivoNombre != null && !_isLoading ? _confirmarEntrega : null,
                      child: _isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Text(_estadoEntrega == 'ENTREGADO' ? 'Entrega Confirmada' : 'Guardar y Enviar Entrega Definitiva'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }
}

class _DateRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _DateRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 11.5, color: AppTheme.inkFaint)),
        Text(
          value,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.bold,
            color: valueColor ?? AppTheme.ink,
          ),
        ),
      ],
    );
  }
}
