import 'package:flutter/material.dart';
import '../../../models/modulo_model.dart';
import '../../../services/api_service.dart';
import '../../../widgets/liquid_glass.dart';

class CrearEditarModuloModal {
  static void showCrearModuloSheet({
    required BuildContext context,
    required int cursoId,
    required int totalModulos,
    required VoidCallback onModuloGuardado,
  }) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final ordenCtrl = TextEditingController(text: '${totalModulos + 1}');
    final imgCtrl = TextEditingController();
    String? plantilla;

    showLiquidGlassModalBottomSheet(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 10,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Crear Nuevo Módulo',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: plantilla ?? '',
                decoration: const InputDecoration(labelText: 'Plantilla de módulo'),
                items: const [
                  DropdownMenuItem(value: '', child: Text('Módulo en blanco')),
                  DropdownMenuItem(value: 'PRIMER_AVANCE', child: Text('Primer avance (1 actividad)')),
                  DropdownMenuItem(value: 'SEGUNDO_AVANCE', child: Text('Segundo avance (1 actividad)')),
                  DropdownMenuItem(value: 'PRESENTACION_FINAL', child: Text('Presentación final (5 actividades)')),
                  DropdownMenuItem(value: 'ACTIVIDADES', child: Text('Actividades (2 actividades)')),
                ],
                onChanged: (value) {
                  setSheetState(() => plantilla = value?.isEmpty == true ? null : value);
                  if (value == 'PRIMER_AVANCE') {
                    titleCtrl.text = 'Primer avance';
                    descCtrl.text = 'Primera revisión del proyecto.';
                  } else if (value == 'SEGUNDO_AVANCE') {
                    titleCtrl.text = 'Segundo avance';
                    descCtrl.text = 'Segunda revisión del proyecto.';
                  } else if (value == 'PRESENTACION_FINAL') {
                    titleCtrl.text = 'Presentación final';
                    descCtrl.text = 'Materiales para la evaluación final de la actividad.';
                  } else if (value == 'ACTIVIDADES') {
                    titleCtrl.text = 'Actividades';
                    descCtrl.text = 'Entregables de la convocatoria.';
                  }
                },
              ),
              if (plantilla != null)
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text('Las actividades tendrán fechas por definir y permanecerán ocultas hasta programarlas.'),
                ),
              const SizedBox(height: 12),
              TextField(
                controller: titleCtrl,
                readOnly: plantilla != null,
                decoration: const InputDecoration(
                  labelText: 'Título del Módulo *',
                  hintText: 'Ej. Módulo 3: Pruebas y Resultados',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                readOnly: plantilla != null,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Descripción del Módulo',
                  hintText: 'Objetivo y alcance temático...',
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: TextField(
                      controller: ordenCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Orden',
                        hintText: '1',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: TextField(
                      controller: imgCtrl,
                      decoration: const InputDecoration(
                        labelText: 'URL Portada (Opcional)',
                        hintText: 'https://...',
                      ),
                    ),
                  ),
                ],
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
                      onPressed: () async {
                        if (titleCtrl.text.trim().isNotEmpty) {
                          Navigator.pop(ctx);
                          final ord = int.tryParse(ordenCtrl.text.trim()) ?? 1;
                          final ok = await ApiService.crearModulo(
                            cursoId,
                            titulo: titleCtrl.text.trim(),
                            plantilla: plantilla,
                            descripcion: descCtrl.text.trim(),
                            orden: ord,
                            imagenUrl: imgCtrl.text.trim(),
                          );
                          if (ok) {
                            onModuloGuardado();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: const Color(0xFF10B981),
                                  content: Text('Módulo "${titleCtrl.text}" publicado exitosamente'),
                                ),
                              );
                            }
                          }
                        }
                      },
                      child: const Text('Guardar'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      )),
    );
  }

  static void showEditarModuloSheet({
    required BuildContext context,
    required ModuloModel modulo,
    required VoidCallback onModuloGuardado,
  }) {
    final titleCtrl = TextEditingController(text: modulo.titulo);
    final descCtrl = TextEditingController(text: modulo.descripcion);
    final ordenCtrl = TextEditingController(text: '${modulo.orden}');
    final imgCtrl = TextEditingController(text: modulo.imagenPortada ?? '');

    showLiquidGlassModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 10,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Editar Módulo',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(
                  labelText: 'Título del Módulo *',
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
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: TextField(
                      controller: ordenCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Orden',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: TextField(
                      controller: imgCtrl,
                      decoration: const InputDecoration(
                        labelText: 'URL Portada',
                      ),
                    ),
                  ),
                ],
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
                      onPressed: () async {
                        if (titleCtrl.text.trim().isNotEmpty) {
                          Navigator.pop(ctx);
                          final ord = int.tryParse(ordenCtrl.text.trim()) ?? 1;
                          final ok = await ApiService.actualizarModulo(
                            modulo.id,
                            titulo: titleCtrl.text.trim(),
                            descripcion: descCtrl.text.trim(),
                            orden: ord,
                            imagenUrl: imgCtrl.text.trim(),
                          );
                          if (ok) {
                            onModuloGuardado();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  backgroundColor: Color(0xFF10B981),
                                  content: Text('Módulo actualizado exitosamente.'),
                                ),
                              );
                            }
                          }
                        }
                      },
                      child: const Text('Guardar Cambios'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
