import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../../config/app_theme.dart';
import '../../models/tarea_model.dart';
import '../../models/user_model.dart';
import '../../services/storage_service.dart';
import '../../services/api_service.dart';
import 'speedgrader_screen.dart';

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
  UserModel? _currentUser;
  final _comentarioCtrl = TextEditingController();

  String? _archivoNombre;
  String? _archivoUrlExistente;
  int? _archivoTamanoBytes;
  Uint8List? _archivoBytes;
  String _estadoEntrega = 'SIN_ENTREGAR';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _initData();
  }

  @override
  void dispose() {
    _comentarioCtrl.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    final user = await StorageService.getUser();
    final draft = await StorageService.getTaskDraft(widget.tarea.id);

    if (mounted) {
      setState(() {
        _currentUser = user;

        // Si ya hay entrega previa en el backend
        if (widget.tarea.archivoNombre != null && widget.tarea.archivoNombre!.isNotEmpty) {
          _archivoNombre = widget.tarea.archivoNombre;
          _archivoUrlExistente = widget.tarea.archivoUrl;
          _estadoEntrega = widget.tarea.estadoEntrega ?? 'ENTREGADO';
          if (widget.tarea.comentarioEstudiante != null) {
            _comentarioCtrl.text = widget.tarea.comentarioEstudiante!;
          }
        } else if (draft != null) {
          _archivoNombre = draft['archivoNombre'] as String?;
          _estadoEntrega = draft['estado'] as String? ?? 'BORRADOR';
          if (draft['comentario'] != null) {
            _comentarioCtrl.text = draft['comentario'] as String;
          }
        } else {
          _estadoEntrega = widget.tarea.estadoEntrega ?? 'SIN_ENTREGAR';
        }
      });
    }
  }

  bool _esFechaCortePasada() {
    if (widget.tarea.fechaCorte == null) return false;
    try {
      final corte = DateTime.parse(widget.tarea.fechaCorte!);
      return DateTime.now().isAfter(corte);
    } catch (_) {
      return false;
    }
  }

  Map<String, dynamic> _calcularTiempoRestante() {
    final fechaStr = widget.tarea.fechaLimite ?? widget.tarea.fechaCorte;
    if (fechaStr == null) {
      return {'texto': 'Sin fecha límite especificada', 'esRetraso': false, 'color': AppTheme.inkSoft};
    }

    try {
      final target = DateTime.parse(fechaStr);
      final now = DateTime.now();
      final diff = target.difference(now);

      if (diff.isNegative) {
        final abs = diff.abs();
        final dias = abs.inDays;
        final horas = abs.inHours % 24;
        final mins = abs.inMinutes % 60;
        final str = dias > 0 ? '$dias d $horas h con retraso' : '$horas h $mins m con retraso';
        return {'texto': str, 'esRetraso': true, 'color': AppTheme.danger};
      } else {
        final dias = diff.inDays;
        final horas = diff.inHours % 24;
        final mins = diff.inMinutes % 60;
        final str = dias > 0 ? '$dias días $horas horas restantes' : '$horas h $mins min restantes';
        return {'texto': str, 'esRetraso': false, 'color': const Color(0xFF10B981)};
      }
    } catch (_) {
      return {'texto': fechaStr, 'esRetraso': false, 'color': AppTheme.inkSoft};
    }
  }

  // Selección Real de Archivos con validación de extensiones y tamaño
  Future<void> _seleccionarArchivoReal() async {
    if (_esFechaCortePasada()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.danger,
          content: Text('La fecha de corte estricta ha expirado. No se permiten nuevas entregas.'),
        ),
      );
      return;
    }

    try {
      final tiposPermitidosStr = widget.tarea.tiposPermitidos ?? '.pdf, .docx, .zip';
      final extensiones = tiposPermitidosStr
          .split(',')
          .map((e) => e.trim().replaceAll('.', '').toLowerCase())
          .where((e) => e.isNotEmpty)
          .toList();

      final result = await FilePicker.pickFiles(
        type: extensiones.isNotEmpty ? FileType.custom : FileType.any,
        allowedExtensions: extensiones.isNotEmpty ? extensiones : null,
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;

        // Validar tamaño en MB
        final sizeMb = file.size / (1024 * 1024);
        if (sizeMb > widget.tarea.tamanoMaximoMb) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: AppTheme.danger,
                content: Text(
                  'El archivo (${sizeMb.toStringAsFixed(1)} MB) supera el límite máximo permitido de ${widget.tarea.tamanoMaximoMb} MB.',
                ),
              ),
            );
          }
          return;
        }

        if (file.bytes == null) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('No se pudieron leer los bytes del archivo.')),
            );
          }
          return;
        }

        setState(() {
          _archivoBytes = file.bytes;
          _archivoNombre = file.name;
          _archivoTamanoBytes = file.size;
          _archivoUrlExistente = null; // Reemplazado por archivo nuevo
          _estadoEntrega = 'BORRADOR';
        });

        // Guardar borrador local
        StorageService.saveTaskDraft(widget.tarea.id, {
          'archivoNombre': _archivoNombre,
          'estado': 'BORRADOR',
          'comentario': _comentarioCtrl.text.trim(),
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF10B981),
              content: Text('Archivo "${file.name}" cargado en borrador local.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: AppTheme.danger, content: Text('Error al seleccionar archivo: $e')),
        );
      }
    }
  }

  void _eliminarArchivo() {
    setState(() {
      _archivoNombre = null;
      _archivoBytes = null;
      _archivoTamanoBytes = null;
      _archivoUrlExistente = null;
      _estadoEntrega = 'SIN_ENTREGAR';
    });
    StorageService.removeTaskDraft(widget.tarea.id);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Borrador de entrega eliminado')),
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
              'Edita el nombre visible con el que el docente recibirá tu entrega:',
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
              if (ctrl.text.trim().isNotEmpty) {
                setState(() => _archivoNombre = ctrl.text.trim());
                StorageService.saveTaskDraft(widget.tarea.id, {
                  'archivoNombre': _archivoNombre,
                  'estado': _estadoEntrega,
                  'comentario': _comentarioCtrl.text.trim(),
                });
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Nombre de archivo actualizado')),
                );
              }
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  // Envío real con subida de archivo multipart al servidor
  Future<void> _confirmarEntrega() async {
    if (_esFechaCortePasada()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.danger,
          content: Text('La fecha de corte estricta ha expirado. Entrega bloqueada.'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      String? finalArchivoUrl = _archivoUrlExistente;

      // Si el estudiante seleccionó un archivo nuevo desde su dispositivo, subirlo primero
      if (_archivoBytes != null && _archivoNombre != null) {
        final uploadRes = await ApiService.subirDocumento(_archivoBytes!, _archivoNombre!);
        if (uploadRes == null) {
          if (mounted) {
            setState(() => _isLoading = false);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: AppTheme.danger,
                content: Text('Error al subir el archivo físico al servidor. Verifica tu conexión.'),
              ),
            );
          }
          return;
        }
        finalArchivoUrl = uploadRes['relativePath'] ?? uploadRes['url'];
      }

      final ok = await ApiService.entregarTarea(
        widget.tarea.id,
        nombreArchivo: _archivoNombre ?? 'Entrega_${widget.tarea.id}.pdf',
        archivoUrl: finalArchivoUrl,
        comentario: _comentarioCtrl.text.trim().isNotEmpty ? _comentarioCtrl.text.trim() : null,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (ok) {
            _estadoEntrega = 'ENTREGADO';
            _archivoUrlExistente = finalArchivoUrl;
          }
        });

        if (ok) {
          await StorageService.removeTaskDraft(widget.tarea.id);
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF10B981),
              content: Text('¡Entrega académica enviada y registrada exitosamente en el servidor!'),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.danger,
              content: Text('Error al procesar la entrega. Verifica si el plazo límite sigue vigente.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: AppTheme.danger, content: Text('Error al enviar entrega: $e')),
        );
      }
    }
  }

  String _formatFileSize(int? bytes) {
    if (bytes == null) return '';
    final kb = bytes / 1024;
    if (kb < 1024) return '${kb.toStringAsFixed(1)} KB';
    final mb = kb / 1024;
    return '${mb.toStringAsFixed(2)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDocenteOJurado = _currentUser != null && (_currentUser!.rol == 'DOCENTE' || _currentUser!.rol == 'JURADO');
    final isAdmin = _currentUser != null && _currentUser!.rol == 'ADMIN';
    final haCerrado = _esFechaCortePasada();
    final tiempoInfo = _calcularTiempoRestante();

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
                    // Módulo dinámico
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.accentSoft,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.tarea.moduloTitulo ?? 'Actividades Generales',
                        style: const TextStyle(color: AppTheme.accentDark, fontSize: 10.5, fontWeight: FontWeight.bold),
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

                    // Fechas y Cronograma Moodle Dinámico
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
                          if (widget.tarea.fechaApertura != null) ...[
                            _DateRow(
                              label: 'Apertura:',
                              value: widget.tarea.fechaApertura!,
                            ),
                            const SizedBox(height: 6),
                          ],
                          _DateRow(
                            label: 'Fecha sugerida de entrega:',
                            value: widget.tarea.fechaLimite ?? 'No fijada',
                          ),
                          if (widget.tarea.fechaCorte != null) ...[
                            const SizedBox(height: 6),
                            _DateRow(
                              label: 'Fecha estricta de corte:',
                              value: widget.tarea.fechaCorte!,
                              valueColor: haCerrado ? AppTheme.danger : null,
                            ),
                          ],
                          const SizedBox(height: 6),
                          _DateRow(
                            label: 'Tiempo restante:',
                            value: tiempoInfo['texto'] as String,
                            valueColor: tiempoInfo['color'] as Color,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Banner si la fecha de corte expiró
            if (haCerrado)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.danger.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.lock_clock_rounded, color: AppTheme.danger, size: 22),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Esta tarea ha alcanzado su fecha de corte estricta. El sistema ya no recibe modificaciones ni nuevas entregas.',
                        style: TextStyle(fontSize: 11.5, color: AppTheme.danger, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),

            // Calificación & Retroalimentación recibida (si ya fue evaluada)
            if (widget.tarea.calificacion != null) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 20),
                          const SizedBox(width: 8),
                          const Text(
                            'Calificación del Docente / Jurado',
                            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${widget.tarea.calificacion!.toStringAsFixed(1)} / ${(widget.tarea.puntajeMaximo ?? 100).toInt()} pts',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981), fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                      if (widget.tarea.retroalimentacion != null && widget.tarea.retroalimentacion!.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text(
                          'Retroalimentación:',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                          ),
                          child: Text(
                            widget.tarea.retroalimentacion!,
                            style: const TextStyle(fontSize: 12, height: 1.35),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Panel según Rol: Docente revisa entregas, Admin supervisa, Estudiante envía documentos
            if (isAdmin)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.admin_panel_settings_rounded, color: Color(0xFF10B981), size: 24),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Modo Supervisión Administrador',
                                  style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.bold),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Como administrador del sistema puedes supervisar la estructura de la tarea y sus parámetros. La evaluación y calificación corresponde al Docente / Jurado asignado.',
                                  style: TextStyle(fontSize: 11, color: AppTheme.inkSoft),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              )
            else if (isDocenteOJurado)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppTheme.accentSoft,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.school_rounded, color: AppTheme.accentDark, size: 24),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Modo Vista Docente',
                                  style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.bold),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Como docente o jurado asignado evalúa los trabajos entregados por los estudiantes en SpeedGrader.',
                                  style: TextStyle(fontSize: 11, color: AppTheme.inkSoft),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (ctx) => SpeedGraderScreen(
                                tareaId: widget.tarea.id,
                                onBack: () => Navigator.of(ctx).pop(),
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.grading_rounded, size: 18),
                        label: const Text('Calificar Entregas de los Alumnos', style: TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              // Subida de Archivo Moodle Real para Estudiantes
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
                      const SizedBox(height: 4),
                      Text(
                        'Formatos permitidos: ${widget.tarea.tiposPermitidos ?? ".pdf, .docx, .zip"} • Límite: ${widget.tarea.tamanoMaximoMb} MB',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                        ),
                      ),
                      const SizedBox(height: 14),

                      if (_archivoNombre == null)
                        InkWell(
                          onTap: haCerrado ? null : _seleccionarArchivoReal,
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                            decoration: BoxDecoration(
                              color: haCerrado
                                  ? (isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken)
                                  : AppTheme.accentSoft.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: haCerrado ? (isDark ? AppTheme.darkLine : AppTheme.line) : AppTheme.accent,
                                width: 1.5,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.cloud_upload_outlined,
                                  size: 38,
                                  color: haCerrado ? AppTheme.inkFaint : AppTheme.accent,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  haCerrado ? 'Entrega cerrada' : 'Toca para seleccionar archivo de tu dispositivo',
                                  style: TextStyle(
                                    color: haCerrado ? AppTheme.inkFaint : AppTheme.accentDark,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  haCerrado
                                      ? 'La fecha de corte expiró'
                                      : 'Explora y selecciona tu documento para enviarlo',
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
                                    Text(
                                      _archivoTamanoBytes != null
                                          ? '${_formatFileSize(_archivoTamanoBytes)} • Listo para enviar'
                                          : (_archivoUrlExistente != null ? 'Archivo registrado en el servidor' : 'Listo para enviar'),
                                      style: const TextStyle(fontSize: 10.5, color: AppTheme.inkFaint),
                                    ),
                                  ],
                                ),
                              ),
                              if (!haCerrado) ...[
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 20),
                                  tooltip: 'Renombrar entrega',
                                  onPressed: _showRenombrarDialog,
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.danger, size: 20),
                                  tooltip: 'Eliminar archivo',
                                  onPressed: _eliminarArchivo,
                                ),
                              ],
                            ],
                          ),
                        ),

                      const SizedBox(height: 14),

                      // Campo de comentarios de la entrega
                      TextField(
                        controller: _comentarioCtrl,
                        maxLines: 2,
                        enabled: !haCerrado,
                        decoration: const InputDecoration(
                          labelText: 'Comentarios de la entrega (Opcional)',
                          hintText: 'Añade alguna aclaración o mensaje para el evaluador...',
                          prefixIcon: Icon(Icons.comment_outlined),
                        ),
                      ),

                      const SizedBox(height: 18),

                      ElevatedButton(
                        onPressed: (_archivoNombre != null && !_isLoading && !haCerrado) ? _confirmarEntrega : null,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(_estadoEntrega == 'ENTREGADO' ? Icons.check_circle_rounded : Icons.send_rounded, size: 18),
                                  const SizedBox(width: 8),
                                  Text(
                                    _estadoEntrega == 'ENTREGADO'
                                        ? 'Actualizar Entrega Registrada'
                                        : 'Guardar y Enviar Entrega Definitiva',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
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
