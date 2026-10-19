import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../../../config/app_theme.dart';
import '../../../models/modulo_model.dart';
import '../../../models/tarea_model.dart';
import '../../../services/api_service.dart';
import '../../../widgets/liquid_glass.dart';

class CrearEditarTareaModal {
  static void show({
    required BuildContext context,
    required int cursoId,
    required List<ModuloModel> modulos,
    TareaModel? tareaExistente,
    int? moduloIdPredefinido,
    required VoidCallback onTareaGuardada,
  }) {
    final isEditing = tareaExistente != null;
    final tituloCtrl = TextEditingController(text: tareaExistente?.titulo ?? '');
    final descCtrl = TextEditingController(text: tareaExistente?.descripcion ?? '');
    final adjuntosGuardados = tareaExistente?.adjuntos.map((a) => Map<String, dynamic>.from(a)).toList() ?? <Map<String, dynamic>>[];
    final nuevosArchivos = <PlatformFile>[];
    bool guardando = false;
    int? selectedModuloId = tareaExistente?.moduloId ?? moduloIdPredefinido;
    if (selectedModuloId == 0) selectedModuloId = null;

    DateTime? fechaHabilitacion = tareaExistente?.fechaApertura != null
        ? DateTime.tryParse(tareaExistente!.fechaApertura!)
        : DateTime.now();
    DateTime? fechaEntrega = tareaExistente?.fechaLimite != null
        ? DateTime.tryParse(tareaExistente!.fechaLimite!)
        : DateTime.now().add(const Duration(days: 7));
    DateTime? fechaCorte = tareaExistente?.fechaCorte != null
        ? DateTime.tryParse(tareaExistente!.fechaCorte!)
        : DateTime.now().add(const Duration(days: 10));

    final tiposCtrl = TextEditingController(text: tareaExistente?.tiposPermitidos ?? '.pdf, .docx, .zip');
    final tamanoCtrl = TextEditingController(text: '${tareaExistente?.tamanoMaximoMb ?? 10}');
    final puntajeCtrl = TextEditingController(text: '${tareaExistente?.puntajeMaximo?.toInt() ?? 100}');

    bool esGrupal = tareaExistente?.esGrupal ?? false;
    bool habilitada = tareaExistente?.habilitada ?? true;

    showLiquidGlassModalBottomSheet(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;

          Future<void> pickFecha(String tipo) async {
            DateTime initial;
            if (tipo == 'hab') {
              initial = fechaHabilitacion ?? DateTime.now();
            } else if (tipo == 'ent') {
              initial = fechaEntrega ?? DateTime.now();
            } else {
              initial = fechaCorte ?? DateTime.now();
            }

            final pickedDate = await showDatePicker(
              context: ctx,
              initialDate: initial,
              firstDate: DateTime(2024),
              lastDate: DateTime(2030),
            );
            if (!ctx.mounted) return;
            if (pickedDate != null) {
              final pickedTime = await showTimePicker(
                context: ctx,
                initialTime: TimeOfDay.fromDateTime(initial),
              );
              final fullDateTime = DateTime(
                pickedDate.year,
                pickedDate.month,
                pickedDate.day,
                pickedTime?.hour ?? 23,
                pickedTime?.minute ?? 59,
              );
              setSheetState(() {
                if (tipo == 'hab') {
                  fechaHabilitacion = fullDateTime;
                } else if (tipo == 'ent') {
                  fechaEntrega = fullDateTime;
                } else {
                  fechaCorte = fullDateTime;
                }
              });
            }
          }

          String formatDt(DateTime? dt) {
            if (dt == null) return 'No definida';
            return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
          }

          return Padding(
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
                  Text(
                    isEditing ? 'Configurar / Editar Tarea Académica' : 'Nueva Tarea Académica Moodle',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 14),

                  // Título
                  TextField(
                    controller: tituloCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Título de la Tarea *',
                      hintText: 'Ej. Entrega del Sprint 2 y Demostración',
                      prefixIcon: Icon(Icons.assignment_outlined),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Descripción
                  TextField(
                    controller: descCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Descripción / Consigna de la Tarea',
                      hintText: 'Especifica los entregables, pautas y rúbrica...',
                    ),
                  ),
                  const SizedBox(height: 14),

                  const Text('Archivos de apoyo', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const Text('Indicaciones o plantillas para consultar y descargar. Máximo 10 archivos de 50 MB.', style: TextStyle(fontSize: 11)),
                  TextButton.icon(
                    icon: const Icon(Icons.attach_file),
                    label: const Text('Añadir archivos'),
                    onPressed: guardando ? null : () async {
                      final result = await FilePicker.pickFiles(allowMultiple: true, type: FileType.any, withData: true);
                      if (!ctx.mounted || result == null) return;
                      final elegidos = result.files;
                      if (adjuntosGuardados.length + nuevosArchivos.length + elegidos.length > 10 ||
                          elegidos.any((file) => file.size > 50 * 1024 * 1024 || file.bytes == null)) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Máximo 10 archivos de 50 MB cada uno.')));
                        return;
                      }
                      setSheetState(() => nuevosArchivos.addAll(elegidos));
                    },
                  ),
                  ...adjuntosGuardados.asMap().entries.map((entry) => ListTile(
                    dense: true,
                    leading: const Icon(Icons.description_outlined, size: 18),
                    title: Text((entry.value['nombre'] ?? 'Archivo').toString(), maxLines: 1, overflow: TextOverflow.ellipsis),
                    trailing: IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: guardando ? null : () => setSheetState(() => adjuntosGuardados.removeAt(entry.key)),
                    ),
                  )),
                  ...nuevosArchivos.asMap().entries.map((entry) => ListTile(
                    dense: true,
                    leading: const Icon(Icons.upload_file, size: 18),
                    title: Text(entry.value.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                    trailing: IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: guardando ? null : () => setSheetState(() => nuevosArchivos.removeAt(entry.key)),
                    ),
                  )),
                  const SizedBox(height: 8),

                  // Selector de Módulo Asociado
                  DropdownButtonFormField<int?>(
                    value: selectedModuloId,
                    decoration: const InputDecoration(
                      labelText: 'Módulo Asociado',
                      prefixIcon: Icon(Icons.folder_outlined),
                    ),
                    items: [
                      const DropdownMenuItem<int?>(
                        value: null,
                        child: Text('Sin Módulo (Actividad General)'),
                      ),
                      ...modulos.map(
                        (m) => DropdownMenuItem<int?>(
                          value: m.id,
                          child: Text(m.titulo, maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                      ),
                    ],
                    onChanged: (val) => setSheetState(() => selectedModuloId = val),
                  ),
                  const SizedBox(height: 16),

                  // Sección Cronograma Moodle
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Cronograma de Entrega (Moodle)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          title: const Text('Fecha de Apertura (Habilitación)', style: TextStyle(fontSize: 12)),
                          subtitle: Text(formatDt(fechaHabilitacion), style: const TextStyle(fontSize: 11, color: AppTheme.accent)),
                          trailing: const Icon(Icons.calendar_today_rounded, size: 18),
                          onTap: () => pickFecha('hab'),
                        ),
                        const Divider(height: 1),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          title: const Text('Fecha de Entrega Sugerida (Límite)', style: TextStyle(fontSize: 12)),
                          subtitle: Text(formatDt(fechaEntrega), style: const TextStyle(fontSize: 11, color: AppTheme.accent)),
                          trailing: const Icon(Icons.calendar_month_rounded, size: 18),
                          onTap: () => pickFecha('ent'),
                        ),
                        const Divider(height: 1),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          title: const Text('Fecha Estricta de Corte (Cierre Definitivo)', style: TextStyle(fontSize: 12)),
                          subtitle: Text(formatDt(fechaCorte), style: const TextStyle(fontSize: 11, color: AppTheme.danger)),
                          trailing: const Icon(Icons.lock_clock_rounded, size: 18),
                          onTap: () => pickFecha('cor'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Formatos, Tamaño y Puntaje
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: tamanoCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Límite MB', hintText: '10'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: puntajeCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Puntaje Máx', hintText: '100'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: tiposCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Extensiones Permitidas',
                      hintText: '.pdf, .docx, .zip',
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Configuración de Tarea Grupal vs Individual
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    value: esGrupal,
                    activeColor: AppTheme.accent,
                    title: const Text('¿Es una entrega grupal?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Una sola entrega representará a todo el equipo de trabajo.', style: TextStyle(fontSize: 11)),
                    onChanged: (val) => setSheetState(() => esGrupal = val),
                  ),

                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    value: habilitada,
                    activeColor: AppTheme.accent,
                    title: const Text('Tarea Habilitada / Visible', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Los alumnos verán y podrán entregar la consigna.', style: TextStyle(fontSize: 11)),
                    onChanged: (val) => setSheetState(() => habilitada = val),
                  ),

                  const SizedBox(height: 20),

                  // Botones Guardar
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Cancelar'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: guardando ? null : () async {
                            if (tituloCtrl.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Por favor, ingresa el título de la tarea.')),
                              );
                              return;
                            }

                            setSheetState(() => guardando = true);
                            final adjuntos = <Map<String, dynamic>>[...adjuntosGuardados];
                            for (final archivo in nuevosArchivos) {
                              final subida = await ApiService.subirDocumento(archivo.bytes!, archivo.name);
                              if (subida == null || subida['relativePath'] == null) {
                                if (ctx.mounted) setSheetState(() => guardando = false);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('No se pudo subir ${archivo.name}. Inténtalo nuevamente.')),
                                  );
                                }
                                return;
                              }
                              adjuntos.add({
                                'nombre': archivo.name,
                                'ruta': subida['relativePath'],
                                'tamanoBytes': subida['size'],
                              });
                            }
                            final data = {
                              'convocatoriaId': cursoId,
                              'titulo': tituloCtrl.text.trim(),
                              'descripcion': descCtrl.text.trim(),
                              'adjuntos': adjuntos,
                              if (selectedModuloId != null && selectedModuloId! > 0) 'moduloId': selectedModuloId,
                              if (fechaHabilitacion != null) 'fechaHabilitacion': fechaHabilitacion!.toIso8601String(),
                              if (fechaEntrega != null) 'fechaEntrega': fechaEntrega!.toIso8601String(),
                              if (fechaCorte != null) 'fechaCorte': fechaCorte!.toIso8601String(),
                              if (fechaEntrega != null) 'fechaLimite': fechaEntrega!.toIso8601String(),
                              'tiposArchivosPermitidos': tiposCtrl.text.trim().isNotEmpty ? tiposCtrl.text.trim() : '.pdf, .docx, .zip',
                              'tamanoMaximoMb': int.tryParse(tamanoCtrl.text.trim()) ?? 10,
                              'puntajeMaximo': double.tryParse(puntajeCtrl.text.trim()) ?? 100.0,
                              'esGrupal': esGrupal,
                              'habilitada': habilitada,
                            };

                            bool ok;
                            if (tareaExistente != null) {
                              ok = await ApiService.actualizarTarea(tareaExistente.id, data);
                            } else {
                              ok = await ApiService.crearTarea(cursoId, data);
                            }

                            if (ok) {
                              if (ctx.mounted) Navigator.pop(ctx);
                              onTareaGuardada();
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    backgroundColor: const Color(0xFF10B981),
                                    content: Text(isEditing
                                        ? 'Tarea académica actualizada exitosamente.'
                                        : 'Tarea "${tituloCtrl.text}" creada exitosamente.'),
                                  ),
                                );
                              }
                            } else {
                              if (ctx.mounted) setSheetState(() => guardando = false);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    backgroundColor: AppTheme.danger,
                                    content: Text('No se pudo guardar la tarea. Revisa los datos ingresados.'),
                                  ),
                                );
                              }
                            }
                          },
                          child: Text(guardando ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Tarea'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
