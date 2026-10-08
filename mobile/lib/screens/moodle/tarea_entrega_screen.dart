import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../../config/app_theme.dart';
import '../../models/tarea_model.dart';
import '../../models/user_model.dart';
import '../../services/storage_service.dart';
import '../../services/api_service.dart';
import 'speedgrader_screen.dart';

class ArchivoAdjuntoItem {
  String nombre;
  String? urlExistente;
  Uint8List? bytes;
  int tamanoBytes;

  ArchivoAdjuntoItem({
    required this.nombre,
    this.urlExistente,
    this.bytes,
    required this.tamanoBytes,
  });
}

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
  final List<ArchivoAdjuntoItem> _archivos = [];

  String _estadoEntrega = 'SIN_ENTREGAR';
  bool _isLoading = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _initData();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
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
          final nombres = widget.tarea.archivoNombre!
              .split(',')
              .map((s) => s.trim())
              .where((s) => s.isNotEmpty)
              .toList();
          final urls = (widget.tarea.archivoUrl ?? '')
              .split(',')
              .map((s) => s.trim())
              .where((s) => s.isNotEmpty)
              .toList();

          _archivos.clear();
          for (int i = 0; i < nombres.length; i++) {
            _archivos.add(
              ArchivoAdjuntoItem(
                nombre: nombres[i],
                urlExistente: i < urls.length ? urls[i] : null,
                tamanoBytes: 0,
              ),
            );
          }

          _estadoEntrega = widget.tarea.estadoEntrega ?? 'ENTREGADO';
          if (widget.tarea.comentarioEstudiante != null) {
            _comentarioCtrl.text = widget.tarea.comentarioEstudiante!;
          }
        } else if (draft != null) {
          final rawList = draft['archivos'] as List<dynamic>?;
          _archivos.clear();
          if (rawList != null) {
            for (final item in rawList) {
              if (item is Map) {
                _archivos.add(
                  ArchivoAdjuntoItem(
                    nombre: item['nombre'] as String? ?? 'archivo',
                    urlExistente: item['url'] as String?,
                    tamanoBytes: (item['tamano'] as num?)?.toInt() ?? 0,
                  ),
                );
              }
            }
          } else if (draft['archivoNombre'] != null) {
            _archivos.add(
              ArchivoAdjuntoItem(
                nombre: draft['archivoNombre'] as String,
                tamanoBytes: 0,
              ),
            );
          }
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

  void _guardarBorradorLocal() {
    StorageService.saveTaskDraft(widget.tarea.id, {
      'archivos': _archivos
          .map((a) => {
                'nombre': a.nombre,
                'url': a.urlExistente,
                'tamano': a.tamanoBytes,
              })
          .toList(),
      'estado': _estadoEntrega,
      'comentario': _comentarioCtrl.text.trim(),
    });
  }

  bool _esAperturaPendiente() {
    if (widget.tarea.fechaApertura == null) return false;
    try {
      final apertura = DateTime.parse(widget.tarea.fechaApertura!);
      // Margen de 1 segundo para sincronización
      return DateTime.now().isBefore(apertura.subtract(const Duration(seconds: 1)));
    } catch (_) {
      return false;
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

  String _formatearDuracionEspanol(int diffMinutos) {
    final absMin = diffMinutos.abs();
    final dias = absMin ~/ (60 * 24);
    final horas = (absMin % (60 * 24)) ~/ 60;
    final minutos = absMin % 60;

    final parts = <String>[];
    if (dias > 0) {
      parts.add('$dias ${dias == 1 ? "día" : "días"}');
    }
    if (horas > 0) {
      parts.add('$horas ${horas == 1 ? "hora" : "horas"}');
    }
    if (minutos > 0 || parts.isEmpty) {
      parts.add('$minutos ${minutos == 1 ? "minuto" : "minutos"}');
    }

    if (parts.length == 1) {
      return parts[0];
    } else if (parts.length == 2) {
      return '${parts[0]} y ${parts[1]}';
    } else {
      return '${parts[0]}, ${parts[1]} y ${parts[2]}';
    }
  }

  Map<String, dynamic> _calcularTiempoRestante() {
    final now = DateTime.now();

    // 1. Apertura pendiente
    if (widget.tarea.fechaApertura != null) {
      try {
        final apertura = DateTime.parse(widget.tarea.fechaApertura!);
        if (now.isBefore(apertura)) {
          final diffSec = apertura.difference(now).inSeconds;
          final diffMin = (diffSec / 60).ceil();
          final duracion = _formatearDuracionEspanol(diffMin);
          return {
            'texto': 'Abre en $duracion',
            'esRetraso': false,
            'pendienteApertura': true,
            'color': const Color(0xFF3B82F6),
          };
        }
      } catch (_) {}
    }

    final fechaStr = widget.tarea.fechaLimite ?? widget.tarea.fechaCorte;
    if (fechaStr == null) {
      return {'texto': 'Sin fecha límite especificada', 'esRetraso': false, 'color': AppTheme.inkSoft};
    }

    try {
      final target = DateTime.parse(fechaStr);
      final diff = target.difference(now);

      if (diff.isNegative) {
        final diffSec = diff.abs().inSeconds;
        final diffMin = (diffSec / 60).floor();
        final duracion = _formatearDuracionEspanol(diffMin);
        return {
          'texto': 'Vencida hace $duracion (con retraso)',
          'esRetraso': true,
          'color': AppTheme.danger,
        };
      } else {
        final diffSec = diff.inSeconds;
        final diffMin = (diffSec / 60).ceil();
        final duracion = _formatearDuracionEspanol(diffMin);
        final prefijo = diffMin == 1 ? 'Queda' : 'Quedan';
        return {
          'texto': '$prefijo $duracion',
          'esRetraso': false,
          'color': const Color(0xFF10B981),
        };
      }
    } catch (_) {
      return {'texto': fechaStr, 'esRetraso': false, 'color': AppTheme.inkSoft};
    }
  }

  // Selección Real de N Archivos con validación de extensiones y tamaño total
  Future<void> _seleccionarArchivosReal() async {
    if (_esAperturaPendiente()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF3B82F6),
          content: Text('Esta actividad aún no está abierta para entregas.'),
        ),
      );
      return;
    }

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
          .where((e) => e.isNotEmpty && e != '*')
          .toList();

      final result = await FilePicker.pickFiles(
        allowMultiple: true,
        type: extensiones.isNotEmpty ? FileType.custom : FileType.any,
        allowedExtensions: extensiones.isNotEmpty ? extensiones : null,
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        // Validar extensiones de cada archivo
        if (extensiones.isNotEmpty) {
          for (final file in result.files) {
            final ext = (file.extension ?? '').toLowerCase();
            if (!extensiones.contains(ext)) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: AppTheme.danger,
                    content: Text(
                      'El archivo "${file.name}" tiene una extensión no permitida. Solo se aceptan: $tiposPermitidosStr',
                    ),
                  ),
                );
              }
              return;
            }
          }
        }

        // Validar tamaño acumulativo total
        final totalBytesActuales = _archivos.fold<int>(0, (sum, a) => sum + a.tamanoBytes);
        final bytesNuevos = result.files.fold<int>(0, (sum, f) => sum + f.size);
        final totalMb = (totalBytesActuales + bytesNuevos) / (1024 * 1024);

        if (totalMb > widget.tarea.tamanoMaximoMb) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: AppTheme.danger,
                content: Text(
                  'El tamaño total de los archivos (${totalMb.toStringAsFixed(2)} MB) supera el límite máximo permitido de ${widget.tarea.tamanoMaximoMb} MB.',
                ),
              ),
            );
          }
          return;
        }

        setState(() {
          for (final file in result.files) {
            if (file.bytes != null) {
              _archivos.removeWhere((a) => a.nombre == file.name);
              _archivos.add(
                ArchivoAdjuntoItem(
                  nombre: file.name,
                  bytes: file.bytes,
                  tamanoBytes: file.size,
                ),
              );
            }
          }
          _estadoEntrega = 'BORRADOR';
        });

        _guardarBorradorLocal();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF10B981),
              content: Text('${result.files.length} archivo(s) agregado(s) a la entrega.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: AppTheme.danger, content: Text('Error al seleccionar archivos: $e')),
        );
      }
    }
  }

  void _eliminarArchivo(int index) {
    setState(() {
      _archivos.removeAt(index);
      if (_archivos.isEmpty) {
        _estadoEntrega = 'SIN_ENTREGAR';
        StorageService.removeTaskDraft(widget.tarea.id);
      } else {
        _guardarBorradorLocal();
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Archivo eliminado de la lista de entrega')),
    );
  }

  void _showRenombrarDialog(int index) {
    final item = _archivos[index];
    final ctrl = TextEditingController(text: item.nombre);

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
                setState(() {
                  item.nombre = ctrl.text.trim();
                });
                _guardarBorradorLocal();
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

  // Envío real con subida de N archivos multipart al servidor
  Future<void> _confirmarEntrega() async {
    if (_esAperturaPendiente()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF3B82F6),
          content: Text('Esta actividad aún no está abierta para entregas.'),
        ),
      );
      return;
    }

    if (_esFechaCortePasada()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.danger,
          content: Text('La fecha de corte estricta ha expirado. Entrega bloqueada.'),
        ),
      );
      return;
    }

    if (_archivos.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.danger,
          content: Text('Debes adjuntar al menos un archivo antes de enviar la entrega.'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final urls = <String>[];
      final nombres = <String>[];

      for (final arch in _archivos) {
        if (arch.bytes != null) {
          final uploadRes = await ApiService.subirDocumento(arch.bytes!, arch.nombre);
          if (uploadRes == null) {
            if (mounted) {
              setState(() => _isLoading = false);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: AppTheme.danger,
                  content: Text('Error al subir "${arch.nombre}" al servidor. Verifica tu conexión.'),
                ),
              );
            }
            return;
          }
          final path = (uploadRes['relativePath'] ?? uploadRes['url'] ?? '') as String;
          urls.add(path);
          nombres.add(arch.nombre);
          arch.urlExistente = path;
          arch.bytes = null;
        } else if (arch.urlExistente != null && arch.urlExistente!.isNotEmpty) {
          urls.add(arch.urlExistente!);
          nombres.add(arch.nombre);
        }
      }

      final joinedUrls = urls.join(', ');
      final joinedNombres = nombres.join(', ');

      final ok = await ApiService.entregarTarea(
        widget.tarea.id,
        nombreArchivo: joinedNombres.isNotEmpty ? joinedNombres : 'Entrega_${widget.tarea.id}.pdf',
        archivoUrl: joinedUrls.isNotEmpty ? joinedUrls : null,
        comentario: _comentarioCtrl.text.trim().isNotEmpty ? _comentarioCtrl.text.trim() : null,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (ok) {
            _estadoEntrega = 'ENTREGADO';
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

  String _formatFileSize(int bytes) {
    if (bytes <= 0) return '';
    final kb = bytes / 1024;
    if (kb < 1024) return '${kb.toStringAsFixed(1)} KB';
    final mb = kb / 1024;
    return '${mb.toStringAsFixed(2)} MB';
  }

  IconData _getFileIcon(String filename) {
    final lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return Icons.picture_as_pdf_rounded;
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return Icons.description_rounded;
    if (lower.endsWith('.zip') || lower.endsWith('.rar')) return Icons.folder_zip_rounded;
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return Icons.image_rounded;
    return Icons.insert_drive_file_rounded;
  }

  Color _getFileColor(String filename) {
    final lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return AppTheme.danger;
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return const Color(0xFF2563EB);
    if (lower.endsWith('.zip') || lower.endsWith('.rar')) return const Color(0xFFD97706);
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return const Color(0xFF10B981);
    return AppTheme.accent;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDocenteOJurado = _currentUser != null && (_currentUser!.rol == 'DOCENTE' || _currentUser!.rol == 'JURADO');
    final isAdmin = _currentUser != null && _currentUser!.rol == 'ADMIN';

    final aperturaPendiente = _esAperturaPendiente();
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
                                : (_archivos.isNotEmpty ? 'Borrador (No enviado)' : 'Sin entregar'),
                            valueColor: _estadoEntrega == 'ENTREGADO'
                                ? const Color(0xFF10B981)
                                : (_archivos.isNotEmpty ? AppTheme.seal : AppTheme.danger),
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

            // Banner si la actividad aún no abre
            if (aperturaPendiente)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF3B82F6).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF3B82F6).withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded, color: Color(0xFF3B82F6), size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Esta actividad aún no está abierta para entregas. Se habilitará el ${widget.tarea.fechaApertura ?? "horario programado"}.',
                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF2563EB), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),

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
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                          ),
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
              // Subida de Archivo Moodle Real para Estudiantes (soporta N archivos)
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
                        'Formatos permitidos: ${widget.tarea.tiposPermitidos ?? ".pdf, .docx, .zip"} • Límite total: ${widget.tarea.tamanoMaximoMb} MB',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Lista de Archivos Adjuntos
                      if (_archivos.isNotEmpty) ...[
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _archivos.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (ctx, index) {
                            final arch = _archivos[index];
                            final icon = _getFileIcon(arch.nombre);
                            final color = _getFileColor(arch.nombre);

                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppTheme.accentSoft.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                children: [
                                  Icon(icon, color: color, size: 26),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          arch.nombre,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                            color: AppTheme.accentDark,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          arch.tamanoBytes > 0
                                              ? '${_formatFileSize(arch.tamanoBytes)} • Listo para enviar'
                                              : (arch.urlExistente != null ? 'Registrado en servidor' : 'Listo para enviar'),
                                          style: const TextStyle(fontSize: 10, color: AppTheme.inkFaint),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (!haCerrado && !aperturaPendiente) ...[
                                    IconButton(
                                      icon: const Icon(Icons.edit_outlined, size: 18),
                                      tooltip: 'Renombrar',
                                      onPressed: () => _showRenombrarDialog(index),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.danger, size: 18),
                                      tooltip: 'Eliminar',
                                      onPressed: () => _eliminarArchivo(index),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 10),
                      ],

                      // Botón para seleccionar o agregar más archivos
                      if (!haCerrado && !aperturaPendiente)
                        InkWell(
                          onTap: _seleccionarArchivosReal,
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                            decoration: BoxDecoration(
                              color: AppTheme.accentSoft.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: AppTheme.accent.withValues(alpha: 0.6),
                                width: 1.2,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.add_circle_outline_rounded, size: 20, color: AppTheme.accent),
                                const SizedBox(width: 8),
                                Text(
                                  _archivos.isEmpty ? 'Seleccionar archivo(s) para entregar' : 'Agregar otro archivo',
                                  style: const TextStyle(
                                    color: AppTheme.accentDark,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      else if (aperturaPendiente)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6).withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF3B82F6).withValues(alpha: 0.2)),
                          ),
                          child: const Center(
                            child: Text(
                              'Apertura pendiente de habilitación',
                              style: TextStyle(color: Color(0xFF2563EB), fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                        )
                      else
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppTheme.danger.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.danger.withValues(alpha: 0.2)),
                          ),
                          child: const Center(
                            child: Text(
                              'Entrega cerrada por fecha de corte',
                              style: TextStyle(color: AppTheme.danger, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),

                      const SizedBox(height: 14),

                      // Campo de comentarios de la entrega
                      TextField(
                        controller: _comentarioCtrl,
                        maxLines: 2,
                        enabled: !haCerrado && !aperturaPendiente,
                        decoration: const InputDecoration(
                          labelText: 'Comentarios de la entrega (Opcional)',
                          hintText: 'Añade alguna aclaración o mensaje para el evaluador...',
                          prefixIcon: Icon(Icons.comment_outlined),
                        ),
                      ),

                      const SizedBox(height: 18),

                      ElevatedButton(
                        onPressed: (_archivos.isNotEmpty && !_isLoading && !haCerrado && !aperturaPendiente)
                            ? _confirmarEntrega
                            : null,
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
