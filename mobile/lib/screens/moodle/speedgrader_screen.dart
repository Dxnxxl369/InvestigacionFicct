import 'package:flutter/material.dart';
import '../../config/app_theme.dart';

class SpeedGraderScreen extends StatefulWidget {
  final VoidCallback onBack;

  const SpeedGraderScreen({super.key, required this.onBack});

  @override
  State<SpeedGraderScreen> createState() => _SpeedGraderScreenState();
}

class _SpeedGraderScreenState extends State<SpeedGraderScreen> {
  final List<Map<String, dynamic>> _estudiantes = [
    {
      'nombre': 'Carlos Méndez Roca',
      'email': 'cmendez@uagrm.edu.bo',
      'inicial': 'CM',
      'archivo': 'Propuesta_Investigacion_IA.pdf',
      'fecha': '28 Sept 2026, 18:30 (A tiempo)',
      'nota': '88',
      'feedback': 'Excelente formulación del problema y marco teórico sólido. Revisar la delimitación geográfica en la pág. 4.',
    },
    {
      'nombre': 'Ana Valenzuela Paz',
      'email': 'avalenzuela@uagrm.edu.bo',
      'inicial': 'AV',
      'archivo': 'Sistema_Blockchain_Voto.pdf',
      'fecha': '29 Sept 2026, 10:15 (A tiempo)',
      'nota': '95',
      'feedback': 'Propuesta muy completa con diagramas de flujo y arquitectura técnica detallada.',
    },
    {
      'nombre': 'David Gutiérrez',
      'email': 'dgutierrez@uagrm.edu.bo',
      'inicial': 'DG',
      'archivo': 'Ciberseguridad_Bancaria.pdf',
      'fecha': '29 Sept 2026, 23:45 (A tiempo)',
      'nota': '76',
      'feedback': 'Falta profundizar en las referencias científicas de los últimos 3 años.',
    },
  ];

  int _currentIndex = 0;
  late TextEditingController _notaCtrl;
  late TextEditingController _feedbackCtrl;

  @override
  void initState() {
    super.initState();
    _loadCurrentStudent();
  }

  void _loadCurrentStudent() {
    final est = _estudiantes[_currentIndex];
    _notaCtrl = TextEditingController(text: est['nota'] as String);
    _feedbackCtrl = TextEditingController(text: est['feedback'] as String);
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

  void _guardarCalificacion() {
    _estudiantes[_currentIndex]['nota'] = _notaCtrl.text;
    _estudiantes[_currentIndex]['feedback'] = _feedbackCtrl.text;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF10B981),
        content: Text('Calificación de ${_estudiantes[_currentIndex]["nombre"]} guardada con éxito'),
      ),
    );

    _nextStudent();
  }

  @override
  Widget build(BuildContext context) {
    final current = _estudiantes[_currentIndex];
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
            const SizedBox(height: 16),

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
                    const SizedBox(height: 16),

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
