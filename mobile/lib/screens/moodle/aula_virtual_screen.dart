import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';
import '../../models/modulo_model.dart';
import '../../models/tarea_model.dart';
import '../../services/api_service.dart';

class AulaVirtualScreen extends StatefulWidget {
  final ConvocatoriaModel curso;
  final VoidCallback onBack;
  final Function(TareaModel) onOpenTarea;
  final VoidCallback onOpenSpeedGrader;

  const AulaVirtualScreen({
    super.key,
    required this.curso,
    required this.onBack,
    required this.onOpenTarea,
    required this.onOpenSpeedGrader,
  });

  @override
  State<AulaVirtualScreen> createState() => _AulaVirtualScreenState();
}

class _AulaVirtualScreenState extends State<AulaVirtualScreen> {
  List<ModuloModel> _modulos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadModulos();
  }

  Future<void> _loadModulos() async {
    setState(() => _isLoading = true);
    final data = await ApiService.getModulos(widget.curso.id);
    if (mounted) {
      setState(() {
        _modulos = data;
        _isLoading = false;
      });
    }
  }

  void _showCrearModuloSheet() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        decoration: BoxDecoration(
          color: Theme.of(ctx).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.line,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Crear Nuevo Módulo Moodle',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: titleCtrl,
              decoration: const InputDecoration(
                labelText: 'Título del Módulo',
                hintText: 'Ej. Módulo 3: Desarrollo y Pruebas',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Descripción del Módulo',
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Cancelar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      if (titleCtrl.text.isNotEmpty) {
                        setState(() {
                          _modulos.add(
                            ModuloModel(
                              id: DateTime.now().millisecondsSinceEpoch,
                              titulo: titleCtrl.text,
                              descripcion: descCtrl.text,
                              orden: _modulos.length + 1,
                            ),
                          );
                        });
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Módulo "${titleCtrl.text}" creado con éxito')),
                        );
                      }
                    },
                    child: const Text('Crear Módulo'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
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
        title: Text(widget.curso.titulo),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_box_rounded),
            tooltip: 'Crear Módulo',
            onPressed: _showCrearModuloSheet,
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
                  // Banner del Aula Moodle
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.accentDark, AppTheme.accent],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Semestre 2026-I • Moodle FICCT',
                            style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          widget.curso.titulo,
                          style: const TextStyle(
                            fontFamily: 'Playfair Display',
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.curso.descripcion,
                          style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.9)),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            ElevatedButton.icon(
                              onPressed: _showCrearModuloSheet,
                              icon: const Icon(Icons.add, size: 16),
                              label: const Text('Nuevo Módulo'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: AppTheme.accentDark,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              ),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton.icon(
                              onPressed: widget.onOpenSpeedGrader,
                              icon: const Icon(Icons.grading_rounded, size: 16, color: Colors.white),
                              label: const Text('SpeedGrader', style: TextStyle(color: Colors.white)),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Colors.white),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Lista de Módulos (Acordeón Moodle)
                  Text(
                    'CONTENIDO DEL CURSO',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.6,
                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                    ),
                  ),
                  const SizedBox(height: 10),

                  ..._modulos.map((modulo) {
                    return Card(
                      margin: const EdgeInsets.only(bottom: 14),
                      child: ExpansionTile(
                        initiallyExpanded: true,
                        leading: const Icon(Icons.folder_open_rounded, color: AppTheme.accent),
                        title: Text(
                          modulo.titulo,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.darkInk : AppTheme.ink,
                          ),
                        ),
                        subtitle: Text(
                          modulo.descripcion,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                          ),
                        ),
                        children: [
                          const Divider(height: 1),
                          if (modulo.tareas.isEmpty)
                            const Padding(
                              padding: EdgeInsets.all(16),
                              child: Text(
                                'No hay tareas publicadas en este módulo.',
                                style: TextStyle(fontSize: 12, color: AppTheme.inkFaint),
                              ),
                            )
                          else
                            ...modulo.tareas.map((tarea) {
                              return ListTile(
                                leading: const Icon(Icons.assignment_outlined, color: AppTheme.seal),
                                title: Text(
                                  tarea.titulo,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                  ),
                                ),
                                subtitle: Text(
                                  'Vence: ${tarea.fechaLimite ?? "Sin límite"}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                  ),
                                ),
                                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                                onTap: () => widget.onOpenTarea(tarea),
                              );
                            }),
                        ],
                      ),
                    );
                  }),

                  const SizedBox(height: 70),
                ],
              ),
            ),
    );
  }
}
