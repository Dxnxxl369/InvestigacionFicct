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
  String _selectedRole = 'TODOS';
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
        title: const Text('Mis Áreas Moodle'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
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
                  // Filtros por Rol
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['TODOS', 'DOCENTE', 'JURADO', 'ESTUDIANTE'].map((role) {
                        final isSelected = _selectedRole == role;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(
                              role == 'TODOS'
                                  ? 'Todos (${_cursos.length})'
                                  : role[0] + role.substring(1).toLowerCase(),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected
                                    ? Colors.white
                                    : (isDark ? AppTheme.darkInk : AppTheme.ink),
                              ),
                            ),
                            selected: isSelected,
                            selectedColor: AppTheme.accent,
                            backgroundColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            side: BorderSide(
                              color: isSelected ? AppTheme.accent : (isDark ? AppTheme.darkLine : AppTheme.line),
                            ),
                            onSelected: (val) {
                              if (val) setState(() => _selectedRole = role);
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Listado de Cursos
                  ..._cursos.map((c) => CourseCardMoodle(
                        curso: c,
                        onTap: () => widget.onOpenAula(c),
                      )),

                  const SizedBox(height: 70),
                ],
              ),
            ),
    );
  }
}
