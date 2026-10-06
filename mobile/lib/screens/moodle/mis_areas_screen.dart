import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';
import '../../services/api_service.dart';
import '../../widgets/moodle_widgets.dart';

class MisAreasScreen extends StatefulWidget {
  final Function(ConvocatoriaModel) onOpenAula;

  const MisAreasScreen({super.key, required this.onOpenAula});

  @override
  State<MisAreasScreen> createState() => _MisAreasScreenState();
}

class _MisAreasScreenState extends State<MisAreasScreen> {
  List<ConvocatoriaModel> _cursos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCursos();
  }

  Future<void> _loadCursos() async {
    setState(() => _isLoading = true);
    final data = await ApiService.getMisAreas();
    if (mounted) {
      setState(() {
        _cursos = data;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Áreas Académicas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualizar áreas',
            onPressed: _loadCursos,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Encabezado informativo de áreas reales asignadas
                  Row(
                    children: [
                      const Icon(Icons.school_rounded, color: AppTheme.accent, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Áreas en las que participas',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppTheme.darkInk : AppTheme.ink,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                        ),
                        child: Text(
                          '${_cursos.length} ${_cursos.length == 1 ? "área" : "áreas"}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Listado directo de cursos y áreas asignadas
                  if (_cursos.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Center(
                        child: Column(
                          children: [
                            const Icon(Icons.school_outlined, size: 48, color: AppTheme.inkFaint),
                            const SizedBox(height: 12),
                            Text(
                              'No tienes asignaturas o áreas académicas asignadas actualmente.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    Column(
                      children: _cursos
                          .map((c) => CourseCardMoodle(
                                curso: c,
                                onTap: () {
                                  if (c.miEstadoInscripcion == 'PENDIENTE') {
                                    showDialog(
                                      context: context,
                                      builder: (ctx) => AlertDialog(
                                        title: const Row(
                                          children: [
                                            Icon(Icons.hourglass_top_rounded, color: Colors.amber),
                                            SizedBox(width: 8),
                                            Text('Solicitud en Revisión', style: TextStyle(fontSize: 16)),
                                          ],
                                        ),
                                        content: Text(
                                          'Tu postulación a "${c.titulo}" aún está en revisión por el docente o tribunal encargado. Una vez admitido, podrás ingresar a realizar tareas y acceder a los contenidos del Aula Virtual.',
                                          style: const TextStyle(fontSize: 13, height: 1.4),
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.pop(ctx),
                                            child: const Text('Entendido'),
                                          ),
                                        ],
                                      ),
                                    );
                                  } else {
                                    widget.onOpenAula(c);
                                  }
                                },
                              ))
                          .toList(),
                    ),
                  const SizedBox(height: 70),
                ],
              ),
            ),
    );
  }
}
