import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/modulo_model.dart';
import '../../../services/api_service.dart';

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
        child: SingleChildScrollView(
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
                'Crear Nuevo Módulo',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(
                  labelText: 'Título del Módulo *',
                  hintText: 'Ej. Módulo 3: Pruebas y Resultados',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
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
      ),
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
        child: SingleChildScrollView(
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
