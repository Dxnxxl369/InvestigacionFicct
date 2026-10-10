import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';
import '../../models/modulo_model.dart';
import '../../models/tarea_model.dart';
import '../../models/actividad_grupo_model.dart';
import '../../models/user_model.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/moodle_widgets.dart';
import '../../widgets/liquid_glass.dart';
import '../../widgets/confirmar_eliminacion_dialog.dart';

import 'modals/crear_editar_modulo_sheet.dart';
import 'modals/crear_editar_tarea_sheet.dart';
import 'modals/grupos_modals.dart';
import 'widgets/tab_modulos_tareas.dart';
import 'widgets/tab_grupos_moodle.dart';
import 'widgets/tab_participantes_moodle.dart';
import 'widgets/tab_calificaciones_moodle.dart';

class AulaVirtualScreen extends StatefulWidget {
  final ConvocatoriaModel curso;
  final VoidCallback onBack;
  final Function(TareaModel) onOpenTarea;
  final Function(int tareaId) onOpenSpeedGrader;

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
  UserModel? _currentUser;
  List<ModuloModel> _modulos = [];
  List<ActividadGrupoModel> _actividadesGrupo = [];
  List<GrupoModel> _gruposArea = [];
  Map<String, dynamic>? _metricasGrupos;
  List<Map<String, dynamic>> _participantes = [];

  bool _isLoading = true;
  bool _isLoadingGrupos = false;
  bool _isLoadingParticipantes = false;
  bool _isLoadingGradebook = false;
  bool _isActionLoading = false;
  final Set<int> _selectedPendientes = {};

  int _currentTab = 0; // 0: Módulos & Tareas, 1: Grupos & Equipos, 2: Participantes, 3: Calificaciones
  int? _selectedGrupoIdForStudent;
  bool _guardandoEleccion = false;

  Map<int, List<Map<String, dynamic>>> _entregasGradebook = {};
  String _searchGradebookQuery = '';

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);
    final user = await StorageService.getUser();
    if (mounted) {
      setState(() => _currentUser = user);
    }
    await Future.wait([
      _loadModulos(),
      _loadActividadesYGrupos(),
      _loadParticipantes(),
    ]);
    _loadGradebookData();
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadGradebookData() async {
    if (!mounted) return;
    setState(() => _isLoadingGradebook = true);
    final allTareas = _modulos.expand((m) => m.tareas).toList();
    final Map<int, List<Map<String, dynamic>>> entregasMap = {};
    for (final tarea in allTareas) {
      if (tarea.id > 0) {
        final res = await ApiService.getEntregasPorTarea(tarea.id);
        entregasMap[tarea.id] = res;
      }
    }
    if (mounted) {
      setState(() {
        _entregasGradebook = entregasMap;
        _isLoadingGradebook = false;
      });
    }
  }

  Future<void> _loadModulos() async {
    final data = await ApiService.getModulos(widget.curso.id);
    if (mounted) {
      setState(() => _modulos = data);
    }
  }

  Future<void> _loadActividadesYGrupos() async {
    setState(() => _isLoadingGrupos = true);
    final acts = await ApiService.getActividadesGrupo(widget.curso.id);
    final gruposData = await ApiService.getGruposArea(widget.curso.id);

    List<GrupoModel> gList = [];
    if (gruposData != null && gruposData['grupos'] is List) {
      gList = (gruposData['grupos'] as List)
          .map((g) => GrupoModel.fromJson(g as Map<String, dynamic>))
          .toList();
    }

    if (mounted) {
      setState(() {
        _actividadesGrupo = acts;
        _gruposArea = gList;
        _metricasGrupos = gruposData;
        _isLoadingGrupos = false;

        // Si el estudiante ya tiene un grupo seleccionado en la primera actividad, inicializarlo
        if (acts.isNotEmpty && acts.first.grupoSeleccionadoId != null) {
          _selectedGrupoIdForStudent = acts.first.grupoSeleccionadoId;
        }
      });
    }
  }

  Future<void> _loadParticipantes() async {
    setState(() => _isLoadingParticipantes = true);
    final data = await ApiService.getParticipantes(widget.curso.id);
    if (mounted) {
      setState(() {
        _participantes = data;
        _isLoadingParticipantes = false;
      });
    }
  }

  // Estudiante: Guardar elección de grupo (Combobox)
  Future<void> _handleGuardarEleccion(ActividadGrupoModel act) async {
    if (_selectedGrupoIdForStudent == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, selecciona un grupo en el menú desplegable.')),
      );
      return;
    }

    setState(() => _guardandoEleccion = true);
    final updated = await ApiService.elegirGrupo(widget.curso.id, act.id, _selectedGrupoIdForStudent!);
    if (mounted) {
      setState(() => _guardandoEleccion = false);
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('¡Te has registrado formalmente en: ${updated.grupoSeleccionadoNombre}!'),
          ),
        );
        _loadActividadesYGrupos();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('No se pudo registrar la elección. El grupo podría estar lleno.'),
          ),
        );
      }
    }
  }

  // Estudiante: Anular elección de grupo
  Future<void> _handleAnularEleccion(ActividadGrupoModel act) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Anular Elección de Grupo'),
        content: Text(
            '¿Deseas desvincularte de "${act.grupoSeleccionadoNombre}"? Podrás elegir otro grupo si aún hay plazas disponibles.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Anular Elección'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _guardandoEleccion = true);
      final ok = await ApiService.anularEleccionGrupo(widget.curso.id, act.id);
      if (mounted) {
        setState(() {
          _guardandoEleccion = false;
          _selectedGrupoIdForStudent = null;
        });
        if (ok) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF10B981),
              content: Text('Elección de grupo anulada con éxito.'),
            ),
          );
          _loadActividadesYGrupos();
        }
      }
    }
  }

  // Docente: Remover Estudiante de Grupo
  Future<void> _handleRemoverMiembro(int grupoId, int participanteId, String nombreEstudiante) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desvincular Estudiante'),
        content: Text(
            '¿Deseas retirar a $nombreEstudiante de este grupo? El estudiante quedará disponible para reasignación.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Retirar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final ok = await ApiService.removerMiembroGrupo(widget.curso.id, grupoId, participanteId);
      if (ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$nombreEstudiante ha sido retirado del grupo.')),
        );
        _loadActividadesYGrupos();
      }
    }
  }

  // Docente: Admitir Solicitud
  Future<void> _handleAdmitir(int participanteId, String nombreEstudiante) async {
    setState(() => _isActionLoading = true);
    final ok = await ApiService.admitirParticipante(widget.curso.id, participanteId);
    if (mounted) {
      setState(() => _isActionLoading = false);
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('¡$nombreEstudiante ha sido admitido(a) en el área!'),
          ),
        );
        _loadParticipantes();
      }
    }
  }

  // Docente: Rechazar Solicitud
  Future<void> _handleRechazar(int participanteId, String nombreEstudiante) async {
    final motivoCtrl = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rechazar Solicitud'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('¿Deseas rechazar la postulación de $nombreEstudiante?'),
            const SizedBox(height: 10),
            TextField(
              controller: motivoCtrl,
              decoration: const InputDecoration(labelText: 'Motivo del rechazo (opcional)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Rechazar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isActionLoading = true);
      final ok = await ApiService.rechazarParticipante(
        widget.curso.id,
        participanteId,
        motivo: motivoCtrl.text.trim(),
      );
      if (mounted) {
        setState(() => _isActionLoading = false);
        if (ok) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppTheme.danger,
              content: Text('Solicitud de $nombreEstudiante rechazada.'),
            ),
          );
          _loadParticipantes();
        }
      }
    }
  }

  // Docente: Admitir Solicitudes en Lote
  Future<void> _handleAdmitirLote() async {
    if (_selectedPendientes.isEmpty) return;
    setState(() => _isActionLoading = true);
    final ids = _selectedPendientes.toList();
    final res = await ApiService.responderLote(widget.curso.id, ids, 'ADMITIR');
    if (mounted) {
      setState(() {
        _isActionLoading = false;
        _selectedPendientes.clear();
      });
      final procesados = res['procesados'] ?? 0;
      final errores = (res['errores'] as List<dynamic>?) ?? [];
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: errores.isEmpty ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
          content: Text('$procesados estudiante(s) admitido(s)${errores.isNotEmpty ? ' (${errores.length} errores)' : ''}.'),
        ),
      );
      _loadParticipantes();
    }
  }

  // Docente: Rechazar Solicitudes en Lote con Motivo
  Future<void> _handleRechazarLote() async {
    if (_selectedPendientes.isEmpty) return;
    final motivoCtrl = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Rechazar ${_selectedPendientes.length} Solicitudes'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('¿Deseas rechazar las ${_selectedPendientes.length} solicitudes seleccionadas?'),
            const SizedBox(height: 12),
            TextField(
              controller: motivoCtrl,
              decoration: const InputDecoration(
                labelText: 'Motivo del rechazo (opcional)',
                hintText: 'Ej. Cupos llenos, no cumple requisitos...',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Rechazar en Lote'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isActionLoading = true);
      final ids = _selectedPendientes.toList();
      final res = await ApiService.responderLote(
        widget.curso.id,
        ids,
        'RECHAZAR',
        motivo: motivoCtrl.text.trim(),
      );
      if (mounted) {
        setState(() {
          _isActionLoading = false;
          _selectedPendientes.clear();
        });
        final procesados = res['procesados'] ?? 0;
        final errores = (res['errores'] as List<dynamic>?) ?? [];
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.danger,
            content:
                Text('$procesados solicitud(es) rechazada(s)${errores.isNotEmpty ? ' (${errores.length} errores)' : ''}.'),
          ),
        );
        _loadParticipantes();
      }
    }
  }

  // Docente/Admin: Exportar Libro Central de Calificaciones a CSV
  Future<void> _exportarLibroCalificacionesCSV() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 12),
            Text('Descargando libro de calificaciones CSV...'),
          ],
        ),
      ),
    );

    final csv = await ApiService.exportarNotasConvocatoria(widget.curso.id);
    if (mounted) {
      if (csv != null && csv.isNotEmpty) {
        try {
          final bytes = Uint8List.fromList(utf8.encode(csv));
          final xFile = XFile.fromData(bytes, name: 'libro_calificaciones_${widget.curso.id}.csv', mimeType: 'text/csv');
          // ignore: deprecated_member_use
          await Share.shareXFiles([xFile], text: 'Libro de Calificaciones - ${widget.curso.titulo}');
        } catch (e) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF10B981),
              content:
                  Text('Libro de calificaciones exportado exitosamente (${csv.split('\n').length - 1} registros).'),
            ),
          );
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('No se pudo exportar el libro de calificaciones.'),
          ),
        );
      }
    }
  }

  void _showCrearModuloSheet() {
    CrearEditarModuloModal.showCrearModuloSheet(
      context: context,
      cursoId: widget.curso.id,
      totalModulos: _modulos.length,
      onModuloGuardado: _loadModulos,
    );
  }

  void _showEditarModuloSheet(ModuloModel modulo) {
    CrearEditarModuloModal.showEditarModuloSheet(
      context: context,
      modulo: modulo,
      onModuloGuardado: _loadModulos,
    );
  }

  void _confirmarEliminarModulo(ModuloModel modulo) {
    ConfirmarEliminacionDialog.mostrar(
      context: context,
      tipo: TipoEliminacion.modulo,
      titulo: modulo.titulo,
      onConfirmar: () async {
        setState(() => _isLoading = true);
        final ok = await ApiService.eliminarModulo(modulo.id);
        if (mounted) {
          setState(() => _isLoading = false);
          if (ok) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: Color(0xFF10B981),
                content: Text('Módulo eliminado exitosamente. Sus tareas ahora son generales.'),
              ),
            );
            _loadModulos();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: AppTheme.danger,
                content: Text('No se pudo eliminar el módulo.'),
              ),
            );
          }
        }
      },
    );
  }

  void _confirmarEliminarTarea(TareaModel tarea) {
    ConfirmarEliminacionDialog.mostrar(
      context: context,
      tipo: TipoEliminacion.tarea,
      titulo: tarea.titulo,
      totalEntregas: tarea.totalEntregas,
      onConfirmar: () async {
        setState(() => _isLoading = true);
        final res = await ApiService.eliminarTarea(tarea.id, forzar: true);
        if (mounted) {
          setState(() => _isLoading = false);
          if (res['success'] == true) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: Color(0xFF10B981),
                content: Text('Tarea eliminada correctamente.'),
              ),
            );
            _loadModulos();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: AppTheme.danger,
                content: Text(res['error']?.toString() ?? 'Error al eliminar la tarea.'),
              ),
            );
          }
        }
      },
    );
  }

  void _confirmarArchivarConvocatoria() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Archivar Convocatoria'),
        content: Text(
          '¿Desea archivar "${widget.curso.titulo}"? El área pasará a modo solo lectura.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.seal),
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _isLoading = true);
              final ok = await ApiService.archivarConvocatoria(widget.curso.id);
              if (mounted) {
                setState(() => _isLoading = false);
                if (ok) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: Color(0xFF10B981),
                      content: Text('Área archivada exitosamente.'),
                    ),
                  );
                  widget.onBack();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: AppTheme.danger,
                      content: Text('Error al archivar la convocatoria.'),
                    ),
                  );
                }
              }
            },
            child: const Text('Archivar'),
          ),
        ],
      ),
    );
  }

  void _confirmarEliminarConvocatoria() {
    final totalTareas = _modulos.fold<int>(0, (sum, m) => sum + m.tareas.length);
    ConfirmarEliminacionDialog.mostrar(
      context: context,
      tipo: TipoEliminacion.convocatoria,
      titulo: widget.curso.titulo,
      totalParticipantes: _participantes.length,
      totalTareas: totalTareas,
      onArchivar: _confirmarArchivarConvocatoria,
      onConfirmar: () async {
        setState(() => _isLoading = true);
        final res = await ApiService.eliminarConvocatoria(widget.curso.id, forzar: true);
        if (mounted) {
          setState(() => _isLoading = false);
          if (res['success'] == true) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: Color(0xFF10B981),
                content: Text('Área eliminada definitivamente.'),
              ),
            );
            widget.onBack();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: AppTheme.danger,
                content: Text(res['error']?.toString() ?? 'Error al eliminar el área.'),
              ),
            );
          }
        }
      },
    );
  }

  void _showCrearOEditarTareaSheet({TareaModel? tareaExistente, int? moduloIdPredefinido}) {
    CrearEditarTareaModal.show(
      context: context,
      cursoId: widget.curso.id,
      modulos: _modulos,
      actividadesGrupo: _actividadesGrupo,
      tareaExistente: tareaExistente,
      moduloIdPredefinido: moduloIdPredefinido,
      onTareaGuardada: _loadModulos,
    );
  }

  void _showCrearGrupoDialog() {
    GruposModals.showCrearGrupo(
      context: context,
      cursoId: widget.curso.id,
      actividadesGrupo: _actividadesGrupo,
      onGrupoCreado: _loadActividadesYGrupos,
    );
  }

  void _showGenerarLoteGruposDialog() {
    GruposModals.showGenerarLote(
      context: context,
      cursoId: widget.curso.id,
      actividadesGrupo: _actividadesGrupo,
      onLoteGenerado: _loadActividadesYGrupos,
    );
  }

  void _showCrearOEditarActividadGrupoDialog({ActividadGrupoModel? actividadExistente}) {
    GruposModals.showCrearOEditarActividad(
      context: context,
      cursoId: widget.curso.id,
      actividadExistente: actividadExistente,
      onActividadGuardada: _loadActividadesYGrupos,
    );
  }

  // Selector interactivo de tarea para SpeedGrader (Docentes y Jurados)
  void _abrirSelectorTareaCalificar() {
    final todasLasTareas = <Map<String, dynamic>>[];
    for (final m in _modulos) {
      for (final t in m.tareas) {
        todasLasTareas.add({'modulo': m.titulo, 'tarea': t});
      }
    }

    if (todasLasTareas.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Colors.amber,
          content: Text('No hay tareas registradas en este curso para calificar.'),
        ),
      );
      return;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    showLiquidGlassModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
                  child: const Icon(Icons.grading_rounded, color: AppTheme.accent, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Seleccionar Tarea a Calificar',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Elige la actividad para ingresar al SpeedGrader',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: todasLasTareas.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (ctx, index) {
                  final item = todasLasTareas[index];
                  final tarea = item['tarea'] as TareaModel;
                  final moduloTitulo = item['modulo'] as String;

                  return InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () {
                      Navigator.pop(ctx);
                      widget.onOpenSpeedGrader(tarea.id);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: AppTheme.accentSoft,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              tarea.esGrupal ? Icons.groups_rounded : Icons.person_outline_rounded,
                              color: AppTheme.accentDark,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  tarea.titulo,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        moduloTitulo,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const Text(' • ', style: TextStyle(fontSize: 11, color: AppTheme.inkFaint)),
                                    Text(
                                      tarea.esGrupal ? 'Grupal' : 'Individual',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: tarea.esGrupal ? Colors.blue.shade600 : Colors.purple.shade600,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.inkFaint),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Diálogo de supervisión institucional para Administradores
  void _showTareaAdminSupervisionDialog(TareaModel tarea) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showLiquidGlassModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
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
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            tarea.esGrupal ? 'ACTIVIDAD GRUPAL' : 'ACTIVIDAD INDIVIDUAL',
                            style: const TextStyle(
                              color: Color(0xFF10B981),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          tarea.titulo,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Consigna y Descripción:',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      tarea.descripcion.isNotEmpty ? tarea.descripcion : 'Sin descripción consignada.',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                        height: 1.4,
                      ),
                    ),
                    if (tarea.fechaLimite != null) ...[
                      const Divider(height: 20),
                      Row(
                        children: [
                          const Icon(Icons.event_outlined, size: 16, color: AppTheme.accent),
                          const SizedBox(width: 6),
                          Text(
                            'Fecha límite: ${tarea.fechaLimite}',
                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.accentSoft.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.accent.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppTheme.accent, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Modo Administrador: La revisión de entregas y asignación de notas es competencia de los Docentes y Jurados evaluadores asignados al área.',
                        style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInk : AppTheme.ink),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isDark ? AppTheme.darkPaperRaised : AppTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Entendido'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabButton(int index, IconData icon, String title, bool isDark) {
    final isSelected = _currentTab == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() => _currentTab = index);
          if (index == 3 && _entregasGradebook.isEmpty) {
            _loadGradebookData();
          }
        },
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.accent : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 15,
                color: isSelected ? Colors.white : (isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
              ),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : (isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isAdmin = _currentUser != null && _currentUser!.rol == 'ADMIN';
    final isDocente = _currentUser != null && _currentUser!.rol == 'DOCENTE';
    final isJurado = _currentUser != null && _currentUser!.rol == 'JURADO';
    final isDocenteOAdmin = isDocente || isAdmin;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: widget.onBack,
        ),
        title: Text(
          widget.curso.titulo,
          style: const TextStyle(fontSize: 16),
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          const NotificacionBadge(),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              _loadAllData();
            },
          ),
          if (isAdmin)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert_rounded),
              tooltip: 'Opciones de administración',
              onSelected: (val) {
                if (val == 'archivar') _confirmarArchivarConvocatoria();
                if (val == 'eliminar') _confirmarEliminarConvocatoria();
              },
              itemBuilder: (ctx) => [
                const PopupMenuItem(
                  value: 'archivar',
                  child: Row(
                    children: [
                      Icon(Icons.archive_outlined, size: 18),
                      SizedBox(width: 8),
                      Text('Archivar Área'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'eliminar',
                  child: Row(
                    children: [
                      Icon(Icons.delete_forever_rounded, size: 18, color: AppTheme.danger),
                      SizedBox(width: 8),
                      Text('Eliminar Área', style: TextStyle(color: AppTheme.danger)),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Banner del Área Académica
                  Card(
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: LinearGradient(
                          colors: isDark
                              ? [AppTheme.darkPaperRaised, AppTheme.darkPaperSunken]
                              : [AppTheme.primary, const Color(0xFF1E3A5F)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  widget.curso.tipo,
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const Spacer(),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'ACTIVO',
                                  style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            widget.curso.titulo,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.curso.descripcion,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.9)),
                          ),
                          const SizedBox(height: 14),

                          // Botones según Rol Específico
                          if (isDocente)
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
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
                                  ElevatedButton.icon(
                                    onPressed: () => _showCrearOEditarTareaSheet(),
                                    icon: const Icon(Icons.add_task_rounded, size: 16),
                                    label: const Text('Nueva Tarea'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.white.withValues(alpha: 0.95),
                                      foregroundColor: AppTheme.accentDark,
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  OutlinedButton.icon(
                                    onPressed: _abrirSelectorTareaCalificar,
                                    icon: const Icon(Icons.grading_rounded, size: 16, color: Colors.white),
                                    label: const Text('Calificar Entregas', style: TextStyle(color: Colors.white)),
                                    style: OutlinedButton.styleFrom(
                                      side: const BorderSide(color: Colors.white),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else if (isJurado)
                            Row(
                              children: [
                                ElevatedButton.icon(
                                  onPressed: _abrirSelectorTareaCalificar,
                                  icon: const Icon(Icons.grading_rounded, size: 16),
                                  label: const Text('Calificar Entregas'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: AppTheme.seal,
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.18),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.gavel_rounded, size: 16, color: Colors.white),
                                      SizedBox(width: 6),
                                      Text(
                                        'Jurado Evaluador',
                                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          else if (isAdmin)
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
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
                                  ElevatedButton.icon(
                                    onPressed: () => _showCrearOEditarTareaSheet(),
                                    icon: const Icon(Icons.add_task_rounded, size: 16),
                                    label: const Text('Nueva Tarea'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.white.withValues(alpha: 0.95),
                                      foregroundColor: AppTheme.accentDark,
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.18),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.admin_panel_settings_rounded, size: 16, color: Colors.white),
                                        SizedBox(width: 6),
                                        Text(
                                          'Supervisión Admin',
                                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.school_rounded, size: 15, color: Colors.white),
                                  SizedBox(width: 8),
                                  Text(
                                    'Estudiante Matriculado',
                                    style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 4 Pestañas Replicando Web (Módulos & Tareas, Grupos & Equipos, Participantes, Calificaciones)
                  LiquidGlassContainer(
                    borderRadius: 16,
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: [
                        _buildTabButton(0, Icons.folder_open_rounded, 'Módulos', isDark),
                        _buildTabButton(1, Icons.groups_rounded, 'Grupos', isDark),
                        _buildTabButton(2, Icons.people_outline_rounded, 'Personas', isDark),
                        _buildTabButton(3, Icons.grade_rounded, 'Notas', isDark),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Contenido según Pestaña Activa
                  if (_currentTab == 0)
                    TabModulosYTareas(
                      actividadesGrupo: _actividadesGrupo,
                      modulos: _modulos,
                      isDark: isDark,
                      isDocente: isDocente,
                      isJurado: isJurado,
                      isAdmin: isAdmin,
                      onOpenSpeedGrader: widget.onOpenSpeedGrader,
                      onOpenTarea: widget.onOpenTarea,
                      onShowAdminSupervision: _showTareaAdminSupervisionDialog,
                      onCrearModulo: _showCrearModuloSheet,
                      onEditarModulo: _showEditarModuloSheet,
                      onEliminarModulo: _confirmarEliminarModulo,
                      onCrearTarea: ({int? moduloId}) => _showCrearOEditarTareaSheet(moduloIdPredefinido: moduloId),
                      onEditarTarea: (t) => _showCrearOEditarTareaSheet(tareaExistente: t),
                      onEliminarTarea: _confirmarEliminarTarea,
                      onToggleHabilitarTarea: (id) async {
                        await ApiService.toggleHabilitarTarea(id);
                        _loadModulos();
                      },
                      onSwitchToGruposTab: () {
                        setState(() => _currentTab = 1);
                      },
                    )
                  else if (_currentTab == 1)
                    TabGruposMoodle(
                      isLoadingGrupos: _isLoadingGrupos,
                      actividadesGrupo: _actividadesGrupo,
                      gruposArea: _gruposArea,
                      metricasGrupos: _metricasGrupos,
                      participantes: _participantes,
                      isDark: isDark,
                      isDocente: isDocente,
                      isJurado: isJurado,
                      isAdmin: isAdmin,
                      selectedGrupoIdForStudent: _selectedGrupoIdForStudent,
                      guardandoEleccion: _guardandoEleccion,
                      onSelectGrupoForStudent: (val) {
                        setState(() => _selectedGrupoIdForStudent = val);
                      },
                      onGuardarEleccion: _handleGuardarEleccion,
                      onAnularEleccion: _handleAnularEleccion,
                      onRemoverMiembro: _handleRemoverMiembro,
                      onShowCrearGrupo: _showCrearGrupoDialog,
                      onShowGenerarLote: _showGenerarLoteGruposDialog,
                      onShowCrearOEditarActividad: _showCrearOEditarActividadGrupoDialog,
                    )
                  else if (_currentTab == 2)
                    TabParticipantesMoodle(
                      isLoadingParticipantes: _isLoadingParticipantes,
                      participantes: _participantes,
                      selectedPendientes: _selectedPendientes,
                      isActionLoading: _isActionLoading,
                      isDark: isDark,
                      isDocenteOAdmin: isDocenteOAdmin,
                      onToggleSelectPendiente: (partId, isSelected) {
                        setState(() {
                          if (isSelected) {
                            _selectedPendientes.add(partId);
                          } else {
                            _selectedPendientes.remove(partId);
                          }
                        });
                      },
                      onToggleSelectAllPendientes: () {
                        final pendientes = _participantes.where((p) => p['estadoInscripcion'] == 'PENDIENTE').toList();
                        setState(() {
                          if (_selectedPendientes.length == pendientes.length) {
                            _selectedPendientes.clear();
                          } else {
                            _selectedPendientes.clear();
                            for (final p in pendientes) {
                              final id = p['id'] as int? ?? 0;
                              if (id > 0) _selectedPendientes.add(id);
                            }
                          }
                        });
                      },
                      onAdmitir: _handleAdmitir,
                      onRechazar: _handleRechazar,
                      onAdmitirLote: _handleAdmitirLote,
                      onRechazarLote: _handleRechazarLote,
                    )
                  else
                    TabCalificacionesMoodle(
                      isLoadingGradebook: _isLoadingGradebook,
                      isDark: isDark,
                      isDocente: isDocente,
                      isJurado: isJurado,
                      isAdmin: isAdmin,
                      modulos: _modulos,
                      participantes: _participantes,
                      entregasGradebook: _entregasGradebook,
                      searchGradebookQuery: _searchGradebookQuery,
                      onSearchChanged: (val) => setState(() => _searchGradebookQuery = val),
                      onExportarCSV: _exportarLibroCalificacionesCSV,
                      onReloadGradebook: _loadGradebookData,
                      onOpenSpeedGrader: widget.onOpenSpeedGrader,
                    ),

                  const SizedBox(height: 95),
                ],
              ),
            ),
    );
  }
}
