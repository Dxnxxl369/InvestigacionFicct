import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/api_service.dart';

class SpeedGraderScreen extends StatefulWidget {
  final VoidCallback onBack;
  final int? tareaId;

  const SpeedGraderScreen({super.key, required this.onBack, this.tareaId});

  @override
  State<SpeedGraderScreen> createState() => _SpeedGraderScreenState();
}

class _SpeedGraderScreenState extends State<SpeedGraderScreen> {
  final List<Map<String, dynamic>> _estudiantes = [];

  int _currentIndex = 0;
  late TextEditingController _notaCtrl;
  late TextEditingController _feedbackCtrl;
  bool _isLoadingBackend = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentStudent();
    _loadBackendSubmissions();
  }

  Future<void> _loadBackendSubmissions() async {
    if (widget.tareaId != null && widget.tareaId! > 0) {
      setState(() => _isLoadingBackend = true);
      final entregas = await ApiService.getEntregasPorTarea(widget.tareaId!);
      if (entregas.isNotEmpty && mounted) {
        setState(() {
          _estudiantes.clear();
          for (final e in entregas) {
            final nombre = (e['estudianteNombre'] ?? 'Estudiante').toString();
            final partes = nombre.split(' ');
            final ini = partes.length >= 2
                ? '${partes[0][0]}${partes[1][0]}'.toUpperCase()
                : (nombre.isNotEmpty ? nombre.substring(0, 1).toUpperCase() : 'E');

            _estudiantes.add({
              'id': e['id'],
              'nombre': nombre,
              'email': e['estudianteEmail'] ?? '',
              'inicial': ini,
              'grupo': e['grupoNombre'] ?? (e['esGrupal'] == true ? 'Grupal' : 'Individual'),
              'equipoNota': e['esGrupal'] == true
                  ? 'Equipo: Calificarás simultáneamente a los integrantes del grupo.'
                  : 'Entrega individual del alumno.',
              'archivo': e['nombreArchivo'] ?? 'Entrega.pdf',
              'fecha': e['fechaEntrega']?.toString().replaceFirst('T', ' ') ?? 'Pendiente',
              'nota': e['calificacion'] != null ? e['calificacion'].toString() : '',
              'feedback': e['retroalimentacion'] ?? '',
            });
          }
          _currentIndex = 0;
          _loadCurrentStudent();
          _isLoadingBackend = false;
        });
      } else if (mounted) {
        setState(() => _isLoadingBackend = false);
      }
    }
  }

  void _loadCurrentStudent() {
    if (_estudiantes.isEmpty) {
      _notaCtrl = TextEditingController();
      _feedbackCtrl = TextEditingController();
      return;
    }
    final est = _estudiantes[_currentIndex];
    _notaCtrl = TextEditingController(text: (est['nota'] ?? '').toString());
    _feedbackCtrl = TextEditingController(text: (est['feedback'] ?? '').toString());
  }

  void _nextStudent() {
    if (_currentIndex < _estudiantes.length - 1) {
      setState(() {
        _currentIndex++;
        _loadCurrentStudent();
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Has llegado al último estudiante registrado.')),
      );
    }
  }

  void _prevStudent() {
    if (_currentIndex > 0) {
      setState(() {
        _currentIndex--;
        _loadCurrentStudent();
      });
    }
  }

  Future<void> _guardarCalificacion() async {
    final est = _estudiantes[_currentIndex];
    est['nota'] = _notaCtrl.text;
    est['feedback'] = _feedbackCtrl.text;

    final entregaId = est['id'] as int?;
    final double? nota = double.tryParse(_notaCtrl.text);

    if (entregaId != null && nota != null) {
      await ApiService.calificarEntrega(
        entregaId,
        calificacion: nota,
        retroalimentacion: _feedbackCtrl.text,
      );
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF10B981),
          content: Text('Calificación de ${est["nombre"]} registrada exitosamente.'),
        ),
      );
      _nextStudent();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingBackend) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: widget.onBack,
          ),
          title: const Text('Calificación de Entregas'),
        ),
        body: const Center(
          child: CircularProgressIndicator(color: AppTheme.accent),
        ),
      );
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_estudiantes.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: widget.onBack,
          ),
          title: const Text('Calificación de Entregas'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.grading_rounded, size: 52, color: AppTheme.inkFaint),
                const SizedBox(height: 14),
                Text(
                  'No hay entregas pendientes para calificar',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Los estudiantes aún no han enviado archivos en esta actividad académica.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: widget.onBack,
                  icon: const Icon(Icons.arrow_back, size: 16),
                  label: const Text('Volver al Aula'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final current = _estudiantes[_currentIndex];

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: widget.onBack,
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_rounded, size: 16),
              onPressed: _currentIndex > 0 ? _prevStudent : null,
            ),
            Text(
              'Alumno ${_currentIndex + 1} de ${_estudiantes.length}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
            ),
            IconButton(
              icon: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
              onPressed: _currentIndex < _estudiantes.length - 1 ? _nextStudent : null,
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Tarjeta Alumno
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: AppTheme.accent,
                          child: Text(
                            current['inicial'] as String,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                current['nombre'] as String,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                ),
                              ),
                              Text(
                                current['email'] as String,
                                style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (current['grupo'] != 'Individual') ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        decoration: BoxDecoration(
                          color: AppTheme.accentSoft,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.group_rounded, size: 16, color: AppTheme.accentDark),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                current['equipoNota'] as String,
                                style: const TextStyle(fontSize: 11, color: AppTheme.accentDark, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),

                    // Archivo entregado
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
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
                                  current['archivo'] as String,
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  current['fecha'] as String,
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF10B981)),
                                ),
                              ],
                            ),
                          ),
                          ElevatedButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Abriendo visor interactivo de documento PDF...')),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.accentSoft,
                              foregroundColor: AppTheme.accentDark,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            ),
                            child: const Text('Ver PDF', style: TextStyle(fontSize: 11)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Enunciado y Criterios Colapsables
            Card(
              child: ExpansionTile(
                leading: const Icon(Icons.assignment_outlined, color: AppTheme.accent, size: 22),
                title: Text(
                  'Enunciado & Criterios de Evaluación',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                  ),
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                    child: Text(
                      'Pautas de Calificación (100 Pts):\n• Claridad y justificación del problema (40 Pts)\n• Coherencia entre árbol de problemas y objetivos (40 Pts)\n• Formato y bibliografía IEEE (20 Pts)',
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.45,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Formulario de Calificación
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Calificación Final',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.darkInk : AppTheme.ink,
                          ),
                        ),
                        Row(
                          children: [
                            SizedBox(
                              width: 65,
                              child: TextField(
                                controller: _notaCtrl,
                                keyboardType: TextInputType.number,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.accent,
                                ),
                                decoration: const InputDecoration(
                                  contentPadding: EdgeInsets.symmetric(vertical: 8),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              '/ 100',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.inkFaint),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Atajos rápidos de calificación
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (final pts in [100, 90, 80, 70, 51]) ...[
                            Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: ActionChip(
                                label: Text('$pts Pts', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                backgroundColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                onPressed: () {
                                  setState(() {
                                    _notaCtrl.text = pts.toString();
                                  });
                                },
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    Text(
                      'Retroalimentación & Observaciones:',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _feedbackCtrl,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        hintText: 'Escribe comentarios de retroalimentación para el alumno...',
                      ),
                    ),
                    const SizedBox(height: 18),

                    ElevatedButton.icon(
                      icon: const Icon(Icons.check_circle_outline_rounded),
                      label: const Text('Guardar y Siguiente Alumno'),
                      onPressed: _guardarCalificacion,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
