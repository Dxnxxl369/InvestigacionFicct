import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/actividad_grupo_model.dart';
import '../../../services/api_service.dart';
import '../../../widgets/liquid_glass.dart';

class GruposModals {
  static Future<void> showCrearGrupo({
    required BuildContext context,
    required int cursoId,
    required List<ActividadGrupoModel> actividadesGrupo,
    required VoidCallback onGrupoCreado,
  }) async {
    final nombreCtrl = TextEditingController();
    final capCtrl = TextEditingController(text: '5');

    final confirm = await showLiquidGlassDialog<bool>(
      context: context,
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.group_add_rounded, color: AppTheme.accent),
              SizedBox(width: 8),
              Text('Nuevo Grupo de Trabajo', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: nombreCtrl,
            decoration: const InputDecoration(
              labelText: 'Nombre del Grupo',
              hintText: 'Ej. Grupo Alpha o Gr1erPar 11',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: capCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Capacidad Máxima de Integrantes',
              hintText: 'Ej. 5',
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Crear Grupo'),
              ),
            ],
          ),
        ],
      ),
    );

    if (confirm == true && nombreCtrl.text.trim().isNotEmpty) {
      final cap = int.tryParse(capCtrl.text.trim()) ?? 5;
      final actId = actividadesGrupo.isNotEmpty ? actividadesGrupo.first.id : null;

      final nuevo = await ApiService.crearGrupo(
        cursoId,
        nombre: nombreCtrl.text.trim(),
        capacidadMaxima: cap,
        actividadGrupoId: actId,
      );

      if (nuevo != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('Grupo "${nuevo.nombre}" creado exitosamente.'),
          ),
        );
        onGrupoCreado();
      }
    }
  }

  static Future<void> showGenerarLote({
    required BuildContext context,
    required int cursoId,
    required List<ActividadGrupoModel> actividadesGrupo,
    required VoidCallback onLoteGenerado,
  }) async {
    final prefijoCtrl = TextEditingController(text: 'Gr1erPar ');
    final cantidadCtrl = TextEditingController(text: '8');
    final capCtrl = TextEditingController(text: '5');
    int? actId = actividadesGrupo.isNotEmpty ? actividadesGrupo.first.id : null;

    final confirm = await showLiquidGlassDialog<bool>(
      context: context,
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.auto_awesome, color: AppTheme.accent),
              SizedBox(width: 8),
              Text('Generar Lote de Grupos', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Genera múltiples grupos secuenciales de forma automática (ej. Gr1erPar 1, Gr1erPar 2...).',
            style: TextStyle(fontSize: 11.5, color: AppTheme.inkSoft),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: prefijoCtrl,
            decoration: const InputDecoration(
              labelText: 'Prefijo de los Grupos',
              hintText: 'Ej. Gr1erPar o Equipo ',
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: cantidadCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Cantidad a Crear',
                    hintText: '8',
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: capCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Cupo por Grupo',
                    hintText: '5',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Generar Lote'),
              ),
            ],
          ),
        ],
      ),
    );

    if (confirm == true && prefijoCtrl.text.trim().isNotEmpty) {
      final cant = int.tryParse(cantidadCtrl.text.trim()) ?? 8;
      final cap = int.tryParse(capCtrl.text.trim()) ?? 5;

      final ok = await ApiService.generarLoteGrupos(
        cursoId,
        prefijo: prefijoCtrl.text.trim(),
        cantidad: cant,
        capacidadMaxima: cap,
        actividadGrupoId: actId,
      );

      if (ok && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('Lote de $cant grupos generado exitosamente.'),
          ),
        );
        onLoteGenerado();
      }
    }
  }

  static Future<void> showCrearOEditarActividad({
    required BuildContext context,
    required int cursoId,
    ActividadGrupoModel? actividadExistente,
    required VoidCallback onActividadGuardada,
  }) async {
    final isEditing = actividadExistente != null;
    final tituloCtrl = TextEditingController(text: actividadExistente?.titulo ?? 'Elección de Equipos de Trabajo');
    final descCtrl = TextEditingController(
        text: actividadExistente?.descripcion ?? 'Selecciona tu grupo de trabajo antes de la fecha límite.');
    final capCtrl = TextEditingController(text: '${actividadExistente?.capacidadPorGrupo ?? 5}');
    final cantGruposCtrl = TextEditingController(text: '8');
    final prefijoCtrl = TextEditingController(text: 'Equipo ');
    bool generarGruposAuto = !isEditing;
    bool permitirCambio = actividadExistente?.permitirCambio ?? true;
    bool mostrarMiembros = actividadExistente?.mostrarMiembros ?? true;

    DateTime fechaApertura = actividadExistente?.fechaApertura != null
        ? (DateTime.tryParse(actividadExistente!.fechaApertura!) ?? DateTime.now())
        : DateTime.now();
    DateTime fechaCierre = actividadExistente?.fechaCierre != null
        ? (DateTime.tryParse(actividadExistente!.fechaCierre!) ?? DateTime.now().add(const Duration(days: 14)))
        : DateTime.now().add(const Duration(days: 14));

    String formatDt(DateTime dt) {
      final d = dt.day.toString().padLeft(2, '0');
      final m = dt.month.toString().padLeft(2, '0');
      final y = dt.year;
      final h = dt.hour.toString().padLeft(2, '0');
      final min = dt.minute.toString().padLeft(2, '0');
      return '$d/$m/$y $h:$min';
    }

    final confirm = await showLiquidGlassDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          Future<void> pickFecha(bool isApertura) async {
            final initial = isApertura ? fechaApertura : fechaCierre;
            final pickedDate = await showDatePicker(
              context: ctx,
              initialDate: initial,
              firstDate: DateTime(2024),
              lastDate: DateTime(2030),
            );
            if (pickedDate != null && ctx.mounted) {
              final pickedTime = await showTimePicker(
                context: ctx,
                initialTime: TimeOfDay.fromDateTime(initial),
              );
              final full = DateTime(
                pickedDate.year,
                pickedDate.month,
                pickedDate.day,
                pickedTime?.hour ?? (isApertura ? 0 : 23),
                pickedTime?.minute ?? (isApertura ? 0 : 59),
              );
              setDialogState(() {
                if (isApertura) {
                  fechaApertura = full;
                } else {
                  fechaCierre = full;
                }
              });
            }
          }

          return SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Icon(isEditing ? Icons.edit_calendar_rounded : Icons.how_to_reg_rounded, color: AppTheme.accent),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        isEditing ? 'Editar Actividad de Grupos' : 'Nueva Actividad de Grupos',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                  TextField(
                    controller: tituloCtrl,
                    decoration: const InputDecoration(labelText: 'Título de la Actividad *'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: descCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Instrucciones para los alumnos'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: capCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Capacidad por grupo (alumnos)'),
                  ),
                  const SizedBox(height: 14),

                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTheme.line),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today_rounded, size: 18, color: AppTheme.accent),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Fecha y Hora de Apertura', style: TextStyle(fontSize: 10.5, color: AppTheme.inkSoft)),
                              Text(formatDt(fechaApertura), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => pickFecha(true),
                          child: const Text('Cambiar'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTheme.line),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.event_busy_rounded, size: 18, color: Colors.red),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Fecha y Hora de Cierre', style: TextStyle(fontSize: 10.5, color: AppTheme.inkSoft)),
                              Text(formatDt(fechaCierre), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => pickFecha(false),
                          child: const Text('Cambiar'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    value: permitirCambio,
                    activeColor: AppTheme.accent,
                    title: const Text('Permitir a estudiantes cambiar de grupo', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    onChanged: (val) => setDialogState(() => permitirCambio = val),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    value: mostrarMiembros,
                    activeColor: AppTheme.accent,
                    title: const Text('Mostrar integrantes a otros estudiantes', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    onChanged: (val) => setDialogState(() => mostrarMiembros = val),
                  ),

                  if (!isEditing) ...[
                    const Divider(),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: generarGruposAuto,
                      activeColor: AppTheme.accent,
                      title: const Text('Generar Lote de Grupos Inicial', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      subtitle: const Text('Crea los grupos vacíos automáticamente.', style: TextStyle(fontSize: 10.5)),
                      onChanged: (val) => setDialogState(() => generarGruposAuto = val),
                    ),
                    if (generarGruposAuto) ...[
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: prefijoCtrl,
                              decoration: const InputDecoration(labelText: 'Prefijo (ej. Equipo )'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: cantGruposCtrl,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Cantidad'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                  const SizedBox(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: Text(isEditing ? 'Guardar Cambios' : 'Crear Actividad'),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      );

    if (confirm == true && tituloCtrl.text.trim().isNotEmpty) {
      final cap = int.tryParse(capCtrl.text.trim()) ?? 5;
      final cant = int.tryParse(cantGruposCtrl.text.trim()) ?? 8;
      final data = {
        'titulo': tituloCtrl.text.trim(),
        'descripcion': descCtrl.text.trim(),
        'capacidadPorGrupo': cap,
        'fechaApertura': fechaApertura.toIso8601String(),
        'fechaCierre': fechaCierre.toIso8601String(),
        'permitirCambio': permitirCambio,
        'mostrarMiembros': mostrarMiembros,
        if (!isEditing) 'generarGrupos': generarGruposAuto,
        if (!isEditing && generarGruposAuto) 'cantidadGrupos': cant,
        if (!isEditing && generarGruposAuto)
          'prefijoGrupos': prefijoCtrl.text.trim().isNotEmpty ? prefijoCtrl.text.trim() : 'Equipo ',
      };

      if (isEditing) {
        final ok = await ApiService.actualizarActividadGrupo(cursoId, actividadExistente.id, data);
        if (ok && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF10B981),
              content: Text('Actividad y plazos de suscripción actualizados con éxito.'),
            ),
          );
          onActividadGuardada();
        }
      } else {
        final ok = await ApiService.crearActividadGrupo(cursoId, data);
        if (ok && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF10B981),
              content: Text('Actividad de selección de grupos creada exitosamente.'),
            ),
          );
          onActividadGuardada();
        }
      }
    }
  }
}
