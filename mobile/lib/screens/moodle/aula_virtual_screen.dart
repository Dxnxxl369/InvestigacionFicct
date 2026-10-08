import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';
import '../../models/modulo_model.dart';
import '../../models/tarea_model.dart';
import '../../models/actividad_grupo_model.dart';
import '../../models/user_model.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/moodle_widgets.dart';

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
        content: Text('¿Deseas desvincularte de "${act.grupoSeleccionadoNombre}"? Podrás elegir otro grupo si aún hay plazas disponibles.'),
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

  // Docente: Crear Nuevo Grupo
  Future<void> _showCrearGrupoDialog() async {
    final nombreCtrl = TextEditingController();
    final capCtrl = TextEditingController(text: '5');

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.group_add_rounded, color: AppTheme.accent),
            SizedBox(width: 8),
            Text('Nuevo Grupo de Trabajo', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Crear Grupo'),
          ),
        ],
      ),
    );

    if (confirm == true && nombreCtrl.text.trim().isNotEmpty) {
      final cap = int.tryParse(capCtrl.text.trim()) ?? 5;
      final actId = _actividadesGrupo.isNotEmpty ? _actividadesGrupo.first.id : null;

      final nuevo = await ApiService.crearGrupo(
        widget.curso.id,
        nombre: nombreCtrl.text.trim(),
        capacidadMaxima: cap,
        actividadGrupoId: actId,
      );

      if (nuevo != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('Grupo "${nuevo.nombre}" creado exitosamente.'),
          ),
        );
        _loadActividadesYGrupos();
      }
    }
  }

  // Docente: Remover Estudiante de Grupo
  Future<void> _handleRemoverMiembro(int grupoId, int participanteId, String nombreEstudiante) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desvincular Estudiante'),
        content: Text('¿Deseas retirar a $nombreEstudiante de este grupo? El estudiante quedará disponible para reasignación.'),
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
            content: Text('$procesados solicitud(es) rechazada(s)${errores.isNotEmpty ? ' (${errores.length} errores)' : ''}.'),
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('Libro de calificaciones exportado exitosamente (${csv.split('\n').length - 1} registros).'),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.danger,
            content: const Text('No se pudo exportar el libro de calificaciones.'),
          ),
        );
      }
    }
  }

  // Docente / Admin: Crear Módulo
  void _showCrearModuloSheet() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final ordenCtrl = TextEditingController(text: '${_modulos.length + 1}');
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
                            widget.curso.id,
                            titulo: titleCtrl.text.trim(),
                            descripcion: descCtrl.text.trim(),
                            orden: ord,
                            imagenUrl: imgCtrl.text.trim(),
                          );
                          if (ok) {
                            _loadModulos();
                            if (mounted) {
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

  // Docente / Admin: Editar Módulo
  void _showEditarModuloSheet(ModuloModel modulo) {
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
                            _loadModulos();
                            if (mounted) {
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

  // Docente / Admin: Crear o Editar Tarea Académica con Parametrización Completa
  void _showCrearOEditarTareaSheet({TareaModel? tareaExistente, int? moduloIdPredefinido}) {
    final isEditing = tareaExistente != null;
    final tituloCtrl = TextEditingController(text: tareaExistente?.titulo ?? '');
    final descCtrl = TextEditingController(text: tareaExistente?.descripcion ?? '');
    int? selectedModuloId = tareaExistente?.moduloId ?? moduloIdPredefinido;
    if (selectedModuloId == 0) selectedModuloId = null;

    DateTime? fechaHabilitacion = tareaExistente?.fechaApertura != null ? DateTime.tryParse(tareaExistente!.fechaApertura!) : DateTime.now();
    DateTime? fechaEntrega = tareaExistente?.fechaLimite != null ? DateTime.tryParse(tareaExistente!.fechaLimite!) : DateTime.now().add(const Duration(days: 7));
    DateTime? fechaCorte = tareaExistente?.fechaCorte != null ? DateTime.tryParse(tareaExistente!.fechaCorte!) : DateTime.now().add(const Duration(days: 10));

    final tiposCtrl = TextEditingController(text: tareaExistente?.tiposPermitidos ?? '.pdf, .docx, .zip');
    final tamanoCtrl = TextEditingController(text: '${tareaExistente?.tamanoMaximoMb ?? 10}');
    final puntajeCtrl = TextEditingController(text: '${tareaExistente?.puntajeMaximo?.toInt() ?? 100}');

    bool esGrupal = tareaExistente?.esGrupal ?? false;
    int? selectedActividadId = tareaExistente?.actividadGrupoId ?? (_actividadesGrupo.isNotEmpty ? _actividadesGrupo.first.id : null);
    bool habilitada = tareaExistente?.habilitada ?? true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
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

          return Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkPaper : AppTheme.paper,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            ),
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.9,
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
                        color: isDark ? AppTheme.darkLine : AppTheme.line,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.accent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(isEditing ? Icons.edit_note_rounded : Icons.add_task_rounded, color: AppTheme.accent, size: 22),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        isEditing ? 'Editar Tarea Académica' : 'Nueva Tarea Académica',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Título
                  TextField(
                    controller: tituloCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Título de la Tarea *',
                      hintText: 'Ej. Entrega Cap 1: Arquitectura y Marco Teórico',
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Descripción / Consigna
                  TextField(
                    controller: descCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Descripción y Criterios de Evaluación *',
                      hintText: 'Detalla lo que el estudiante debe presentar...',
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Módulo asignado
                  DropdownButtonFormField<int?>(
                    value: selectedModuloId,
                    decoration: const InputDecoration(
                      labelText: 'Módulo Temático',
                      prefixIcon: Icon(Icons.folder_open_outlined),
                    ),
                    items: [
                      const DropdownMenuItem<int?>(
                        value: null,
                        child: Text('Actividades Generales (Sin Módulo)'),
                      ),
                      ..._modulos.where((m) => m.id > 0).map((m) => DropdownMenuItem<int?>(
                        value: m.id,
                        child: Text(m.titulo, overflow: TextOverflow.ellipsis),
                      )),
                    ],
                    onChanged: (val) => setSheetState(() => selectedModuloId = val),
                  ),
                  const SizedBox(height: 16),

                  // Control de Fechas (Moodle Triple Schedule)
                  Text(
                    'Cronograma de Entrega (Estilo Moodle):',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: isDark ? AppTheme.darkInk : AppTheme.ink),
                  ),
                  const SizedBox(height: 8),

                  // Fecha Apertura
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.event_available_outlined, color: Colors.blue, size: 20),
                    title: const Text('Permitir entregas desde:', style: TextStyle(fontSize: 12)),
                    subtitle: Text(formatDt(fechaHabilitacion), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                    trailing: TextButton(
                      onPressed: () => pickFecha('hab'),
                      child: const Text('Cambiar'),
                    ),
                  ),
                  // Fecha Entrega
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.alarm_on_outlined, color: AppTheme.accent, size: 20),
                    title: const Text('Fecha límite de entrega:', style: TextStyle(fontSize: 12)),
                    subtitle: Text(formatDt(fechaEntrega), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                    trailing: TextButton(
                      onPressed: () => pickFecha('ent'),
                      child: const Text('Cambiar'),
                    ),
                  ),
                  // Fecha Corte
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.event_busy_outlined, color: Colors.red, size: 20),
                    title: const Text('Fecha de corte estricta (cut-off):', style: TextStyle(fontSize: 12)),
                    subtitle: Text(formatDt(fechaCorte), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                    trailing: TextButton(
                      onPressed: () => pickFecha('corte'),
                      child: const Text('Cambiar'),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Configuración de Archivos y Puntaje
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: puntajeCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Puntaje Máximo',
                            hintText: '100',
                            suffixText: 'pts',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: tamanoCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Tamaño Máx. MB',
                            hintText: '10',
                            suffixText: 'MB',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: tiposCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Extensiones Permitidas',
                      hintText: '.pdf, .docx, .zip',
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Modalidad Grupal
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    value: esGrupal,
                    activeColor: AppTheme.accent,
                    title: const Text('¿Es Tarea Grupal por Equipos?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Una sola entrega por equipo con nota sincronizada.', style: TextStyle(fontSize: 11)),
                    onChanged: (val) => setSheetState(() => esGrupal = val),
                  ),

                  if (esGrupal) ...[
                    const SizedBox(height: 6),
                    DropdownButtonFormField<int?>(
                      value: selectedActividadId,
                      decoration: const InputDecoration(
                        labelText: 'Actividad de Selección de Grupo Asociada',
                        prefixIcon: Icon(Icons.group_work_outlined),
                      ),
                      items: [
                        const DropdownMenuItem<int?>(
                          value: null,
                          child: Text('-- Sin actividad vinculada --'),
                        ),
                        ..._actividadesGrupo.map((act) => DropdownMenuItem<int?>(
                          value: act.id,
                          child: Text(act.titulo, overflow: TextOverflow.ellipsis),
                        )),
                      ],
                      onChanged: (val) => setSheetState(() => selectedActividadId = val),
                    ),
                  ],

                  const SizedBox(height: 14),

                  // Habilitada
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
                          onPressed: () async {
                            if (tituloCtrl.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Por favor, ingresa el título de la tarea.')),
                              );
                              return;
                            }

                            Navigator.pop(ctx);
                            final data = {
                              'convocatoriaId': widget.curso.id,
                              'titulo': tituloCtrl.text.trim(),
                              'descripcion': descCtrl.text.trim(),
                              if (selectedModuloId != null && selectedModuloId! > 0) 'moduloId': selectedModuloId,
                              if (fechaHabilitacion != null) 'fechaHabilitacion': fechaHabilitacion!.toIso8601String(),
                              if (fechaEntrega != null) 'fechaEntrega': fechaEntrega!.toIso8601String(),
                              if (fechaCorte != null) 'fechaCorte': fechaCorte!.toIso8601String(),
                              if (fechaEntrega != null) 'fechaLimite': fechaEntrega!.toIso8601String(),
                              'tiposArchivosPermitidos': tiposCtrl.text.trim().isNotEmpty ? tiposCtrl.text.trim() : '.pdf, .docx, .zip',
                              'tamanoMaximoMb': int.tryParse(tamanoCtrl.text.trim()) ?? 10,
                              'puntajeMaximo': double.tryParse(puntajeCtrl.text.trim()) ?? 100.0,
                              'esGrupal': esGrupal,
                              if (esGrupal && selectedActividadId != null) 'actividadGrupoId': selectedActividadId,
                              'habilitada': habilitada,
                            };

                            bool ok;
                            if (tareaExistente != null) {
                              ok = await ApiService.actualizarTarea(tareaExistente.id, data);
                            } else {
                              ok = await ApiService.crearTarea(widget.curso.id, data);
                            }

                            if (ok) {
                              _loadModulos();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    backgroundColor: const Color(0xFF10B981),
                                    content: Text(isEditing ? 'Tarea académica actualizada exitosamente.' : 'Tarea "${tituloCtrl.text}" creada exitosamente.'),
                                  ),
                                );
                              }
                            } else {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    backgroundColor: AppTheme.danger,
                                    content: Text('No se pudo guardar la tarea. Revisa los datos ingresados.'),
                                  ),
                                );
                              }
                            }
                          },
                          child: Text(isEditing ? 'Guardar Cambios' : 'Crear Tarea'),
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

  // Docente / Admin: Crear o Editar Actividad de Selección de Grupo (Group Choice)
  Future<void> _showCrearOEditarActividadGrupoDialog({ActividadGrupoModel? actividadExistente}) async {
    final isEditing = actividadExistente != null;
    final tituloCtrl = TextEditingController(text: actividadExistente?.titulo ?? 'Elección de Equipos de Trabajo');
    final descCtrl = TextEditingController(text: actividadExistente?.descripcion ?? 'Selecciona tu grupo de trabajo antes de la fecha límite.');
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

    final confirm = await showDialog<bool>(
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

          return AlertDialog(
            title: Row(
              children: [
                Icon(isEditing ? Icons.edit_calendar_rounded : Icons.how_to_reg_rounded, color: AppTheme.accent),
                const SizedBox(width: 8),
                Text(
                  isEditing ? 'Editar Actividad de Grupos' : 'Nueva Actividad de Grupos',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
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

                  // 1. Fecha y Hora de Apertura
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

                  // 2. Fecha y Hora de Cierre
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

                  // Switches de configuración
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
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(isEditing ? 'Guardar Cambios' : 'Crear Actividad'),
              ),
            ],
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
        if (!isEditing && generarGruposAuto) 'prefijoGrupos': prefijoCtrl.text.trim().isNotEmpty ? prefijoCtrl.text.trim() : 'Equipo ',
      };

      if (isEditing) {
        final ok = await ApiService.actualizarActividadGrupo(widget.curso.id, actividadExistente.id, data);
        if (ok && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF10B981),
              content: Text('Actividad y plazos de suscripción actualizados con éxito.'),
            ),
          );
          _loadActividadesYGrupos();
        }
      } else {
        final ok = await ApiService.crearActividadGrupo(widget.curso.id, data);
        if (ok && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF10B981),
              content: Text('Actividad de selección de grupos creada exitosamente.'),
            ),
          );
          _loadActividadesYGrupos();
        }
      }
    }
  }

  // Docente / Admin: Generar Lote Automático de Grupos
  Future<void> _showGenerarLoteGruposDialog() async {
    final prefijoCtrl = TextEditingController(text: 'Gr1erPar ');
    final cantidadCtrl = TextEditingController(text: '8');
    final capCtrl = TextEditingController(text: '5');
    int? actId = _actividadesGrupo.isNotEmpty ? _actividadesGrupo.first.id : null;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.auto_awesome, color: AppTheme.accent),
            SizedBox(width: 8),
            Text('Generar Lote de Grupos', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Generar Lote'),
          ),
        ],
      ),
    );

    if (confirm == true && prefijoCtrl.text.trim().isNotEmpty) {
      final cant = int.tryParse(cantidadCtrl.text.trim()) ?? 8;
      final cap = int.tryParse(capCtrl.text.trim()) ?? 5;

      final ok = await ApiService.generarLoteGrupos(
        widget.curso.id,
        prefijo: prefijoCtrl.text.trim(),
        cantidad: cant,
        capacidadMaxima: cap,
        actividadGrupoId: actId,
      );

      if (ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('Lote de $cant grupos generado exitosamente.'),
          ),
        );
        _loadActividadesYGrupos();
      }
    }
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
                            style: const TextStyle(
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
                  Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperSunken,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                    ),
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
                    _buildTabModulosYTareas(isDark, isDocente, isJurado, isAdmin)
                  else if (_currentTab == 1)
                    _buildTabGrupos(isDark, isDocente, isJurado, isAdmin)
                  else if (_currentTab == 2)
                    _buildTabParticipantes(isDark, isDocenteOAdmin)
                  else
                    _buildTabCalificaciones(isDark, isDocente, isJurado, isAdmin),

                  const SizedBox(height: 60),
                ],
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

  String _formatearFechaCorta(String? fechaStr) {
    if (fechaStr == null || fechaStr.isEmpty) return '';
    final dt = DateTime.tryParse(fechaStr);
    if (dt != null) {
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    return fechaStr;
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

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(ctx).size.height * 0.75,
        ),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkPaper : AppTheme.paper,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
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
                  color: isDark ? AppTheme.darkLine : AppTheme.line,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
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

  // Diálogo de supervisión institucional para Administradores (Solo lectura / parámetros)
  void _showTareaAdminSupervisionDialog(TareaModel tarea) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkPaper : AppTheme.paper,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.darkLine : AppTheme.line,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
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
    );
  }

  // ==========================================
  // TAB 0: MÓDULOS & TAREAS (MOODLE STREAM)
  // ==========================================
  Widget _buildTabModulosYTareas(bool isDark, bool isDocente, bool isJurado, bool isAdmin) {
    final isDocenteOAdmin = isDocente || isAdmin;
    final isDocenteOJurado = isDocente || isJurado;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Banner de Actividades de Selección de Grupo (Moodle Choice) en el flujo del aula
        if (_actividadesGrupo.isNotEmpty) ...[
          ..._actividadesGrupo.map((act) {
            final tieneGrupo = act.grupoSeleccionadoNombre != null;
            return Card(
              margin: const EdgeInsets.only(bottom: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: AppTheme.accent.withValues(alpha: 0.35), width: 1.5),
              ),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    colors: isDark
                        ? [AppTheme.seal.withValues(alpha: 0.35), AppTheme.darkPaperRaised]
                        : [AppTheme.accent.withValues(alpha: 0.08), Colors.white],
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
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.accent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.groups_rounded, color: AppTheme.accent, size: 20),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text(
                                    'ACTIVIDAD DE SELECCIÓN DE GRUPO',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.accent,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const Spacer(),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: act.abierta
                                          ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                          : Colors.red.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      act.abierta ? 'ABIERTA' : 'CERRADA',
                                      style: TextStyle(
                                        fontSize: 8.5,
                                        fontWeight: FontWeight.bold,
                                        color: act.abierta ? const Color(0xFF10B981) : Colors.red,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                act.titulo,
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isDocenteOAdmin
                          ? 'Gestión de equipos: ${act.grupos.length} grupos configurados con cupos de ${act.capacidadPorGrupo} integrantes.'
                          : (isJurado
                              ? 'Visualización de equipos: ${act.grupos.length} grupos configurados.'
                              : (tieneGrupo
                                  ? '✓ Quedaste formalmente registrado en: ${act.grupoSeleccionadoNombre}'
                                  : 'Cupos limitados por grupo. Elige tu grupo antes de la fecha de cierre.')),
                      style: TextStyle(
                        fontSize: 11.5,
                        color: tieneGrupo ? const Color(0xFF10B981) : (isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                        fontWeight: tieneGrupo ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerRight,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          setState(() => _currentTab = 1);
                        },
                        icon: const Icon(Icons.arrow_forward_rounded, size: 14),
                        label: Text(
                          isDocenteOAdmin
                              ? 'Gestionar Equipos'
                              : (isJurado
                                  ? 'Ver Equipos'
                                  : (tieneGrupo ? 'Ver / Modificar Elección' : 'Seleccionar Grupo')),
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],

        // Módulos temáticos del aula virtual
        if (_modulos.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                children: [
                  const Icon(Icons.folder_open_rounded, size: 40, color: AppTheme.inkFaint),
                  const SizedBox(height: 12),
                  const Text('No hay módulos de aprendizaje publicados aún.', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('El docente publicará los contenidos temáticos y tareas aquí.', style: TextStyle(fontSize: 11, color: AppTheme.inkSoft)),
                  if (isDocenteOAdmin) ...[
                    const SizedBox(height: 14),
                    ElevatedButton.icon(
                      onPressed: _showCrearModuloSheet,
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Crear Primer Módulo'),
                    ),
                  ],
                ],
              ),
            ),
          )
        else
          ..._modulos.map((modulo) {
            final hasCover = modulo.imagenPortada != null && modulo.imagenPortada!.trim().isNotEmpty;
            final coverUrl = modulo.imagenPortada?.trim() ?? '';

            return Card(
              margin: const EdgeInsets.only(bottom: 14),
              clipBehavior: Clip.antiAlias,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Theme(
                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                child: Column(
                  children: [
                    if (hasCover)
                      SizedBox(
                        height: 110,
                        width: double.infinity,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.network(
                              coverUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                child: const Icon(Icons.broken_image_outlined, color: AppTheme.inkFaint),
                              ),
                            ),
                            Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.transparent,
                                    Colors.black.withValues(alpha: 0.6),
                                  ],
                                ),
                              ),
                            ),
                            Positioned(
                              bottom: 8,
                              left: 14,
                              right: 14,
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.5),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '${modulo.tareas.length} ${modulo.tareas.length == 1 ? 'actividad' : 'actividades'}',
                                      style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ExpansionTile(
                      initiallyExpanded: true,
                      tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      leading: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppTheme.accentSoft,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: hasCover
                            ? Image.network(
                                coverUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(Icons.folder_rounded, color: AppTheme.accent, size: 20),
                              )
                            : const Icon(Icons.folder_rounded, color: AppTheme.accent, size: 20),
                      ),
                      title: Text(
                        modulo.titulo,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppTheme.darkInk : AppTheme.ink,
                        ),
                      ),
                      subtitle: Text(
                        modulo.descripcion.isNotEmpty
                            ? modulo.descripcion
                            : '${modulo.tareas.length} actividades disponibles',
                        style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                      ),
                      children: [
                        if (modulo.tareas.isEmpty)
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              'No hay tareas publicadas en este módulo.',
                              style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                            ),
                          )
                        else
                          ...modulo.tareas.map((tarea) {
                            final entregada = tarea.estadoEntrega == 'ENTREGADO' || tarea.estadoEntrega == 'CALIFICADO';
                            return InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () {
                                if (isDocenteOJurado) {
                                  // Para docentes/jurados: abre el SpeedGrader para calificar
                                  widget.onOpenSpeedGrader(tarea.id);
                                } else if (isAdmin) {
                                  // Para administradores: abre vista de supervisión sin calificar
                                  _showTareaAdminSupervisionDialog(tarea);
                                } else {
                                  // Para estudiantes: abre la vista de entrega de la tarea
                                  widget.onOpenTarea(tarea);
                                }
                              },
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: !tarea.habilitada
                                        ? (isDark ? AppTheme.darkLine : AppTheme.line).withValues(alpha: 0.5)
                                        : (entregada
                                            ? const Color(0xFF10B981).withValues(alpha: 0.3)
                                            : (isDark ? AppTheme.darkLine : AppTheme.line)),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Fila 1: Icono + Título Completo + Acciones Docente/Admin
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          width: 32,
                                          height: 32,
                                          margin: const EdgeInsets.only(right: 10, top: 1),
                                          decoration: BoxDecoration(
                                            color: entregada
                                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                                : (isDocenteOJurado
                                                    ? AppTheme.sealSoft
                                                    : (isAdmin ? const Color(0xFF10B981).withValues(alpha: 0.15) : AppTheme.goldSoft)),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Icon(
                                            isDocenteOJurado
                                                ? Icons.grading_rounded
                                                : (isAdmin
                                                    ? Icons.assignment_outlined
                                                    : (entregada ? Icons.check_circle_rounded : Icons.pending_actions_rounded)),
                                            color: entregada
                                                ? const Color(0xFF10B981)
                                                : (isDocenteOJurado
                                                    ? AppTheme.seal
                                                    : (isAdmin ? const Color(0xFF10B981) : AppTheme.gold)),
                                            size: 18,
                                          ),
                                        ),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                tarea.titulo,
                                                style: TextStyle(
                                                  fontSize: 13.5,
                                                  fontWeight: FontWeight.bold,
                                                  color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                                  height: 1.25,
                                                ),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              if (tarea.descripcion.isNotEmpty) ...[
                                                const SizedBox(height: 2),
                                                Text(
                                                  tarea.descripcion,
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                                  ),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ],
                                            ],
                                          ),
                                        ),
                                        if (isDocenteOAdmin) ...[
                                          const SizedBox(width: 6),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              InkWell(
                                                borderRadius: BorderRadius.circular(6),
                                                onTap: () async {
                                                  await ApiService.toggleHabilitarTarea(tarea.id);
                                                  _loadModulos();
                                                },
                                                child: Padding(
                                                  padding: const EdgeInsets.all(4),
                                                  child: Icon(
                                                    tarea.habilitada ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                                                    size: 16,
                                                    color: tarea.habilitada ? AppTheme.accent : AppTheme.inkFaint,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 4),
                                              InkWell(
                                                borderRadius: BorderRadius.circular(6),
                                                onTap: () => _showCrearOEditarTareaSheet(tareaExistente: tarea),
                                                child: Padding(
                                                  padding: const EdgeInsets.all(4),
                                                  child: const Icon(Icons.edit_outlined, size: 16, color: AppTheme.accent),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 8),

                                    // Fila 2: Chips (Grupal/Individual, Fecha Límite) y Badge de Acción a la derecha
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                          decoration: BoxDecoration(
                                            color: (tarea.esGrupal ? Colors.blue : Colors.purple).withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(5),
                                          ),
                                          child: Text(
                                            tarea.esGrupal ? '👥 Grupal' : '👤 Individual',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                              color: tarea.esGrupal ? Colors.blue.shade700 : Colors.purple.shade700,
                                            ),
                                          ),
                                        ),
                                        if (tarea.fechaLimite != null && tarea.fechaLimite!.isNotEmpty) ...[
                                          const SizedBox(width: 6),
                                          Flexible(
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.event_outlined, size: 12, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                                                const SizedBox(width: 3),
                                                Flexible(
                                                  child: Text(
                                                    _formatearFechaCorta(tarea.fechaLimite),
                                                    style: TextStyle(
                                                      fontSize: 10.5,
                                                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                                    ),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                        const Spacer(),
                                        if (isDocenteOJurado)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: AppTheme.accentSoft,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Text(
                                                  'CALIFICAR',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: AppTheme.accentDark,
                                                    letterSpacing: 0.3,
                                                  ),
                                                ),
                                                SizedBox(width: 3),
                                                Icon(Icons.arrow_forward_ios_rounded, size: 9, color: AppTheme.accentDark),
                                              ],
                                            ),
                                          )
                                        else if (isAdmin)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Text(
                                              'SUPERVISIÓN',
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: Color(0xFF10B981),
                                              ),
                                            ),
                                          )
                                        else ...[
                                          if (tarea.calificacion != null) ...[
                                            Text(
                                              'Nota: ${tarea.calificacion}/100',
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.accent),
                                            ),
                                            const SizedBox(width: 6),
                                          ],
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                            decoration: BoxDecoration(
                                              color: entregada ? const Color(0xFF10B981).withValues(alpha: 0.15) : AppTheme.goldSoft,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              entregada ? 'ENTREGADO' : (tarea.estadoEntrega ?? 'SIN_ENTREGAR'),
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: entregada ? const Color(0xFF10B981) : AppTheme.gold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        if (isDocenteOAdmin && modulo.id > 0)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(14, 4, 14, 10),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton.icon(
                                  onPressed: () => _showEditarModuloSheet(modulo),
                                  icon: const Icon(Icons.edit_outlined, size: 14),
                                  label: const Text('Editar Módulo', style: TextStyle(fontSize: 11)),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton.icon(
                                  onPressed: () => _showCrearOEditarTareaSheet(moduloIdPredefinido: modulo.id),
                                  icon: const Icon(Icons.add_task_rounded, size: 14),
                                  label: const Text('Nueva Tarea', style: TextStyle(fontSize: 11)),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  // ==========================================
  // TAB 1: GRUPOS & EQUIPOS (MOODLE CHOICE)
  // ==========================================
  Widget _buildTabGrupos(bool isDark, bool isDocente, bool isJurado, bool isAdmin) {
    final isDocenteOAdmin = isDocente || isAdmin;
    if (_isLoadingGrupos) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(color: AppTheme.accent),
        ),
      );
    }

    final act = _actividadesGrupo.isNotEmpty ? _actividadesGrupo.first : null;
    final grupos = act != null && act.grupos.isNotEmpty ? act.grupos : _gruposArea;

    // Métricas
    final totalGrupos = grupos.length;
    final totalEstudiantes = _metricasGrupos?['totalEstudiantesArea'] ?? _participantes.length;
    final conEquipo = _metricasGrupos?['totalConEquipoArea'] ?? 0;
    final sinEquipo = _metricasGrupos?['totalSinEquipoArea'] ?? (totalEstudiantes > conEquipo ? totalEstudiantes - conEquipo : 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Tarjetas de Métricas de Grupos (4 en fila)
        Row(
          children: [
            _buildMetricCard('Total Grupos', '$totalGrupos', AppTheme.ink, isDark),
            const SizedBox(width: 8),
            _buildMetricCard('En Aula', '$totalEstudiantes', Colors.blue, isDark),
            const SizedBox(width: 8),
            _buildMetricCard('Con Equipo', '$conEquipo', const Color(0xFF10B981), isDark),
            const SizedBox(width: 8),
            _buildMetricCard('Sin Equipo', '$sinEquipo', sinEquipo > 0 ? Colors.amber : AppTheme.inkFaint, isDark),
          ],
        ),
        const SizedBox(height: 16),

        if (isDocenteOAdmin || isJurado)
          // ----------------------------------------------------
          // VISTA DOCENTE / JURADO: ORQUESTACIÓN Y MONITOREO DE EQUIPOS
          // ----------------------------------------------------
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isDocenteOAdmin ? 'Panel Docente: Orquestación de Equipos' : 'Equipos de Trabajo Registrados',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              isDocenteOAdmin
                                  ? 'Monitorea la conformación de grupos y reasigna estudiantes.'
                                  : 'Consulta la conformación de los grupos y sus integrantes para evaluación.',
                              style: const TextStyle(fontSize: 11, color: AppTheme.inkSoft),
                            ),
                          ],
                        ),
                      ),
                      if (isDocenteOAdmin)
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            if (act != null)
                              ElevatedButton.icon(
                                onPressed: () => _showCrearOEditarActividadGrupoDialog(actividadExistente: act),
                                icon: const Icon(Icons.edit_calendar_rounded, size: 13),
                                label: const Text('Editar Plazos', style: TextStyle(fontSize: 11)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.accent,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                ),
                              )
                            else
                              OutlinedButton.icon(
                                onPressed: () => _showCrearOEditarActividadGrupoDialog(),
                                icon: const Icon(Icons.assignment_ind_outlined, size: 13),
                                label: const Text('Elección', style: TextStyle(fontSize: 11)),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                ),
                              ),
                            OutlinedButton.icon(
                              onPressed: _showGenerarLoteGruposDialog,
                              icon: const Icon(Icons.auto_awesome, size: 13),
                              label: const Text('Lote', style: TextStyle(fontSize: 11)),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: _showCrearGrupoDialog,
                              icon: const Icon(Icons.add, size: 13),
                              label: const Text('Grupo', style: TextStyle(fontSize: 11)),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  if (act != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: AppTheme.accentSoft,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.how_to_reg_rounded, size: 18, color: AppTheme.accentDark),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      act.titulo,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                    if (act.descripcion.isNotEmpty)
                                      Text(
                                        act.descripcion,
                                        style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                  ],
                                ),
                              ),
                              if (isDocenteOAdmin)
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.accent),
                                  tooltip: 'Editar plazos y parámetros',
                                  onPressed: () => _showCrearOEditarActividadGrupoDialog(actividadExistente: act),
                                ),
                            ],
                          ),
                          const Divider(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today_rounded, size: 13, color: AppTheme.accent),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        'Abre: ${_formatearFechaCorta(act.fechaApertura)}',
                                        style: TextStyle(fontSize: 10.5, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: Row(
                                  children: [
                                    const Icon(Icons.event_busy_rounded, size: 13, color: Colors.red),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        'Cierra: ${_formatearFechaCorta(act.fechaCierre)}',
                                        style: TextStyle(fontSize: 10.5, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (act.abierta ? const Color(0xFF10B981) : Colors.red).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  act.abierta ? 'ABIERTA' : 'CERRADA',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                    color: act.abierta ? const Color(0xFF10B981) : Colors.red,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Máx ${act.capacidadPorGrupo} miembros/grupo',
                                style: const TextStyle(fontSize: 10.5, color: AppTheme.inkSoft),
                              ),
                              if (act.permitirCambio) ...[
                                const Text(' • ', style: TextStyle(fontSize: 10.5, color: AppTheme.inkFaint)),
                                const Text('Permite cambio', style: TextStyle(fontSize: 10.5, color: AppTheme.inkSoft)),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  if (grupos.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: Text(
                          'No hay grupos configurados todavía. Toca "Nuevo Grupo" para iniciar.',
                          style: TextStyle(fontSize: 12, color: AppTheme.inkSoft),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  else
                    ...grupos.map((g) {
                      final maxCap = g.capacidadMaxima;
                      final count = g.cantidadMiembros;
                      final pct = maxCap > 0 ? (count / maxCap).clamp(0.0, 1.0) : 0.0;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  g.nombre,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(width: 8),
                                if (g.completo)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.red.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text('COMPLETO', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.red)),
                                  ),
                                const Spacer(),
                                Text(
                                  '$count / $maxCap integrantes',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.inkSoft),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: pct,
                                backgroundColor: isDark ? AppTheme.darkLine : AppTheme.line,
                                color: g.completo ? Colors.red : (pct > 0.8 ? Colors.amber : AppTheme.accent),
                                minHeight: 6,
                              ),
                            ),
                            const SizedBox(height: 10),

                            // Lista de Miembros del Grupo
                            if (g.miembros.isEmpty)
                              const Text('Sin estudiantes asignados a este grupo.', style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.inkFaint))
                            else
                              Column(
                                children: g.miembros.asMap().entries.map((entry) {
                                  final idx = entry.key + 1;
                                  final m = entry.value;
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 3),
                                    child: Row(
                                      children: [
                                        Text('$idx. ', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.inkFaint)),
                                        Expanded(
                                          child: Text(
                                            m.nombreCompleto,
                                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        if (isDocenteOAdmin)
                                          IconButton(
                                            icon: const Icon(Icons.person_remove_rounded, size: 16, color: AppTheme.danger),
                                            tooltip: 'Retirar del grupo',
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(),
                                            onPressed: () => _handleRemoverMiembro(g.id, m.participanteId, m.nombreCompleto),
                                          ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
          )
        else
          // ----------------------------------------------------
          // VISTA ESTUDIANTE: COMBOBOX DE SELECCIÓN DE GRUPO
          // ----------------------------------------------------
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.accent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.how_to_reg_rounded, color: AppTheme.accent, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              act?.titulo ?? 'Elección de Grupo de Trabajo',
                              style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.bold),
                            ),
                            if (act != null && act.fechaCierre != null)
                              Text(
                                'Plazo límite: ${_formatearFechaCorta(act.fechaCierre)}${act.fechaApertura != null ? ' • Apertura: ${_formatearFechaCorta(act.fechaApertura)}' : ''}',
                                style: const TextStyle(fontSize: 11, color: AppTheme.inkSoft),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (act?.descripcion != null && act!.descripcion.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        act.descripcion,
                        style: const TextStyle(fontSize: 11.5, color: AppTheme.inkSoft),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),

                  // Banner de Estado Actual del Estudiante
                  if (act != null && act.grupoSeleccionadoNombre != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 22),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Elección Confirmada', style: TextStyle(fontSize: 10, color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                                Text(
                                  act.grupoSeleccionadoNombre!,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                          if (act.abierta && act.permitirCambio)
                            TextButton.icon(
                              onPressed: () => _handleAnularEleccion(act),
                              icon: const Icon(Icons.close_rounded, size: 14, color: AppTheme.danger),
                              label: const Text('Anular', style: TextStyle(fontSize: 11, color: AppTheme.danger)),
                            ),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: Colors.blue, size: 20),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Aún no has seleccionado un grupo. Elige una opción en el menú desplegable y confirma tu elección.',
                              style: TextStyle(fontSize: 11.5, color: Colors.blue),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 18),

                  // COMBOBOX DE SELECCIÓN DE GRUPO
                  const Text(
                    'Seleccionar Grupo en Lista:',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),

                  DropdownButtonFormField<int>(
                    value: _selectedGrupoIdForStudent,
                    decoration: InputDecoration(
                      hintText: '-- Selecciona tu grupo --',
                      prefixIcon: const Icon(Icons.groups_outlined),
                      filled: true,
                      fillColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                    ),
                    items: grupos.map((g) {
                      final esMiGrupo = act?.grupoSeleccionadoId == g.id;
                      final estaLleno = g.completo && !esMiGrupo;
                      final label = estaLleno
                          ? '${g.nombre} (${g.cantidadMiembros}/${g.capacidadMaxima} - Completo)'
                          : '${g.nombre} (${g.cantidadMiembros}/${g.capacidadMaxima} plazas)';

                      return DropdownMenuItem<int>(
                        value: g.id,
                        enabled: !estaLleno,
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: estaLleno ? AppTheme.inkFaint : null,
                            fontWeight: esMiGrupo ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() => _selectedGrupoIdForStudent = val);
                    },
                  ),
                  const SizedBox(height: 16),

                  // Botón Guardar Elección
                  ElevatedButton.icon(
                    onPressed: _guardandoEleccion || act == null || _selectedGrupoIdForStudent == null || act.cerrada
                        ? null
                        : () => _handleGuardarEleccion(act),
                    icon: _guardandoEleccion
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.save_rounded, size: 16),
                    label: Text(
                      _guardandoEleccion ? 'Guardando...' : 'Guardar mi elección',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Listado informativo de miembros por grupo
                  const Text(
                    'Distribución de Grupos y Miembros:',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),

                  ...grupos.map((g) {
                    final esMiEleccion = act?.grupoSeleccionadoId == g.id;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: esMiEleccion
                            ? AppTheme.accent.withValues(alpha: 0.1)
                            : (isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: esMiEleccion ? AppTheme.accent : (isDark ? AppTheme.darkLine : AppTheme.line),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(g.nombre, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              if (esMiEleccion) ...[
                                const SizedBox(width: 6),
                                const Text('(Tu Grupo)', style: TextStyle(fontSize: 10.5, color: AppTheme.accent, fontWeight: FontWeight.bold)),
                              ],
                              const Spacer(),
                              Text('${g.cantidadMiembros}/${g.capacidadMaxima}', style: const TextStyle(fontSize: 11, color: AppTheme.inkSoft)),
                            ],
                          ),
                          if (act != null && !act.mostrarMiembros && !isDocenteOAdmin) ...[
                            const SizedBox(height: 4),
                            Text(
                              esMiEleccion ? '✓ Estás registrado (Lista de integrantes oculta por el docente)' : 'Lista de integrantes oculta por el docente.',
                              style: const TextStyle(fontSize: 10.5, fontStyle: FontStyle.italic, color: AppTheme.inkFaint),
                            ),
                          ] else if (g.miembros.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              g.miembros.map((m) => m.nombreCompleto).join(', '),
                              style: const TextStyle(fontSize: 10.5, color: AppTheme.inkSoft),
                            ),
                          ],
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildMetricCard(String label, String value, Color color, bool isDark) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
        ),
        child: Column(
          children: [
            Text(label, style: const TextStyle(fontSize: 9.5, color: AppTheme.inkFaint, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }

  String _formatNombre(Map<String, dynamic> p) {
    final nombre = (p['nombre'] ?? '').toString().trim();
    final apellidos = (p['apellidos'] ?? p['apellido'] ?? '').toString().trim();
    if (nombre.isNotEmpty || apellidos.isNotEmpty) {
      return '$nombre $apellidos'.trim();
    }
    if (p['nombreCompleto'] != null && p['nombreCompleto'].toString().trim().isNotEmpty) {
      return p['nombreCompleto'].toString().trim();
    }
    if (p['estudianteNombre'] != null && p['estudianteNombre'].toString().trim().isNotEmpty) {
      return p['estudianteNombre'].toString().trim();
    }
    if (p['usuarioNombre'] != null && p['usuarioNombre'].toString().trim().isNotEmpty) {
      return p['usuarioNombre'].toString().trim();
    }
    return 'Participante';
  }

  String _formatGrupo(Map<String, dynamic> p) {
    if (p['gruposNombres'] is List && (p['gruposNombres'] as List).isNotEmpty) {
      return (p['gruposNombres'] as List).join(', ');
    }
    final equipo = (p['nombreEquipo'] ?? p['grupoNombre']) as String?;
    if (equipo != null && equipo.trim().isNotEmpty) {
      return equipo.trim();
    }
    return '';
  }

  Widget _buildAvatar(String nombre, String? foto, String rol) {
    final fotoUrl = ApiService.resolveFileUrl(foto);
    final bg = rol == 'DOCENTE'
        ? AppTheme.accent
        : (rol == 'JURADO' ? AppTheme.seal : (rol == 'ADMIN' ? const Color(0xFF10B981) : AppTheme.gold));

    return CircleAvatar(
      radius: 17,
      backgroundColor: bg,
      backgroundImage: fotoUrl != null ? NetworkImage(fotoUrl) : null,
      child: fotoUrl == null
          ? Text(
              nombre.isNotEmpty ? nombre[0].toUpperCase() : 'U',
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
            )
          : null,
    );
  }

  // ==========================================
  // TAB 2: PARTICIPANTES & SOLICITUDES
  // ==========================================
  Widget _buildTabParticipantes(bool isDark, bool isDocenteOAdmin) {
    if (_isLoadingParticipantes) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(color: AppTheme.accent),
        ),
      );
    }

    final docentesYJurados = _participantes.where((p) => p['rol'] == 'DOCENTE' || p['rol'] == 'JURADO').toList();
    final pendientes = _participantes.where((p) => p['estadoInscripcion'] == 'PENDIENTE').toList();
    final admitidos = _participantes
        .where((p) => (p['rol'] == null || p['rol'] == 'ESTUDIANTE') && p['estadoInscripcion'] == 'ACEPTADO')
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Tribunal y Docentes Asignados
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.school_rounded, color: AppTheme.accent, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Tribunal & Docentes a Cargo (${docentesYJurados.length})',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (docentesYJurados.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'No hay docentes o jurados asignados formalmente a esta área.',
                      style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft, fontStyle: FontStyle.italic),
                    ),
                  )
                else
                  ...docentesYJurados.map((doc) {
                    final nombre = _formatNombre(doc);
                    final rol = (doc['rol'] ?? 'DOCENTE').toString().toUpperCase();
                    final email = (doc['email'] ?? '').toString();
                    final foto = doc['fotoPerfil'] as String?;
                    final uId = (doc['usuarioId'] as num?)?.toInt() ?? 0;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: uId > 0
                            ? () => showPerfilParticipanteModal(
                                  context,
                                  usuarioId: uId,
                                  fallbackNombre: nombre,
                                  fallbackRol: rol,
                                  fallbackEmail: email,
                                  fallbackFoto: foto,
                                )
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          child: Row(
                            children: [
                              _buildAvatar(nombre, foto, rol),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      nombre,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                      ),
                                    ),
                                    if (email.isNotEmpty)
                                      Text(
                                        email,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              RoleBadge(role: rol),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.chevron_right_rounded,
                                size: 18,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // 2. Solicitudes de Admisión Pendientes (Para Docente y Admin)
        if (isDocenteOAdmin && pendientes.isNotEmpty) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.pending_actions_rounded, color: Colors.amber, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Solicitudes de Admisión (${pendientes.length})',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        icon: Icon(
                          _selectedPendientes.length == pendientes.length
                              ? Icons.check_box_rounded
                              : Icons.check_box_outline_blank_rounded,
                          size: 18,
                        ),
                        label: Text(
                          _selectedPendientes.length == pendientes.length ? 'Deseleccionar' : 'Seleccionar todo',
                          style: const TextStyle(fontSize: 11),
                        ),
                        onPressed: () {
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
                      ),
                    ],
                  ),
                  if (_selectedPendientes.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.accentSoft,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Text(
                            '${_selectedPendientes.length} seleccionados',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.accentDark,
                            ),
                          ),
                          const Spacer(),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.check_rounded, size: 14),
                            label: const Text('Admitir', style: TextStyle(fontSize: 11)),
                            onPressed: _isActionLoading ? null : _handleAdmitirLote,
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.danger,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.close_rounded, size: 14),
                            label: const Text('Rechazar', style: TextStyle(fontSize: 11)),
                            onPressed: _isActionLoading ? null : _handleRechazarLote,
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  ...pendientes.map((sol) {
                    final partId = sol['id'] as int? ?? 0;
                    final nombre = _formatNombre(sol);
                    final email = (sol['email'] ?? '').toString();
                    final foto = sol['fotoPerfil'] as String?;
                    final uId = (sol['usuarioId'] as num?)?.toInt() ?? 0;
                    final grupo = _formatGrupo(sol);
                    final isChecked = _selectedPendientes.contains(partId);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isChecked
                              ? AppTheme.accent
                              : (isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                        ),
                      ),
                      child: Row(
                        children: [
                          Checkbox(
                            value: isChecked,
                            activeColor: AppTheme.accent,
                            onChanged: (val) {
                              setState(() {
                                if (val == true) {
                                  _selectedPendientes.add(partId);
                                } else {
                                  _selectedPendientes.remove(partId);
                                }
                              });
                            },
                          ),
                          InkWell(
                            onTap: uId > 0
                                ? () => showPerfilParticipanteModal(
                                      context,
                                      usuarioId: uId,
                                      fallbackNombre: nombre,
                                      fallbackRol: 'ESTUDIANTE',
                                      fallbackEmail: email,
                                      fallbackFoto: foto,
                                    )
                                : null,
                            child: _buildAvatar(nombre, foto, 'ESTUDIANTE'),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: InkWell(
                              onTap: uId > 0
                                  ? () => showPerfilParticipanteModal(
                                        context,
                                        usuarioId: uId,
                                        fallbackNombre: nombre,
                                        fallbackRol: 'ESTUDIANTE',
                                        fallbackEmail: email,
                                        fallbackFoto: foto,
                                      )
                                  : null,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    nombre,
                                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                                  ),
                                  if (email.isNotEmpty)
                                    Text(
                                      email,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                      ),
                                    ),
                                  if (grupo.isNotEmpty)
                                    Text(
                                      'Equipo solicitado: $grupo',
                                      style: const TextStyle(fontSize: 10.5, color: AppTheme.accent, fontWeight: FontWeight.w600),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 22),
                            tooltip: 'Admitir',
                            onPressed: _isActionLoading ? null : () => _handleAdmitir(partId, nombre),
                          ),
                          IconButton(
                            icon: const Icon(Icons.cancel_rounded, color: AppTheme.danger, size: 22),
                            tooltip: 'Rechazar',
                            onPressed: _isActionLoading ? null : () => _handleRechazar(partId, nombre),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
        ],

        // 3. Estudiantes Matriculados
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.groups_rounded, color: Color(0xFF10B981), size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Estudiantes Matriculados (${admitidos.length})',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (admitidos.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(
                      child: Text('No hay estudiantes admitidos aún en esta área.', style: TextStyle(fontSize: 12, color: AppTheme.inkSoft)),
                    ),
                  )
                else
                  ...admitidos.map((part) {
                    final nombre = _formatNombre(part);
                    final email = (part['email'] ?? '').toString();
                    final foto = part['fotoPerfil'] as String?;
                    final uId = (part['usuarioId'] as num?)?.toInt() ?? 0;
                    final grupo = _formatGrupo(part);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: uId > 0
                            ? () => showPerfilParticipanteModal(
                                  context,
                                  usuarioId: uId,
                                  fallbackNombre: nombre,
                                  fallbackRol: 'ESTUDIANTE',
                                  fallbackEmail: email,
                                  fallbackFoto: foto,
                                )
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          child: Row(
                            children: [
                              _buildAvatar(nombre, foto, 'ESTUDIANTE'),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      nombre,
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                      ),
                                    ),
                                    if (email.isNotEmpty)
                                      Text(
                                        email,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                        ),
                                      ),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Icon(
                                          grupo.isNotEmpty ? Icons.group_rounded : Icons.group_off_rounded,
                                          size: 13,
                                          color: grupo.isNotEmpty ? const Color(0xFF10B981) : AppTheme.inkFaint,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          grupo.isNotEmpty ? 'Grupo: $grupo' : 'Sin grupo asignado',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: grupo.isNotEmpty ? FontWeight.w600 : FontWeight.normal,
                                            color: grupo.isNotEmpty ? const Color(0xFF10B981) : AppTheme.inkFaint,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Icon(
                                Icons.chevron_right_rounded,
                                size: 18,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // TAB 3: CALIFICACIONES (GRADEBOOK CENTRAL)
  // ==========================================
  Widget _buildTabCalificaciones(bool isDark, bool isDocente, bool isJurado, bool isAdmin) {
    final allTareas = _modulos.expand((m) => m.tareas).where((t) => t.id > 0).toList();
    final admitidos = _participantes
        .where((p) => (p['rol'] == null || p['rol'] == 'ESTUDIANTE') && p['estadoInscripcion'] == 'ACEPTADO')
        .toList();

    if (_isLoadingGradebook) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: Column(
            children: [
              CircularProgressIndicator(color: AppTheme.accent),
              SizedBox(height: 12),
              Text('Cargando matriz global de calificaciones...', style: TextStyle(fontSize: 12, color: AppTheme.inkSoft)),
            ],
          ),
        ),
      );
    }

    if (isDocente || isJurado || isAdmin) {
      // Filtrar estudiantes según búsqueda
      final query = _searchGradebookQuery.trim().toLowerCase();
      final filteredStudents = admitidos.where((est) {
        if (query.isEmpty) return true;
        final nombre = _formatNombre(est).toLowerCase();
        final email = (est['email'] ?? '').toString().toLowerCase();
        final grupo = _formatGrupo(est).toLowerCase();
        return nombre.contains(query) || email.contains(query) || grupo.contains(query);
      }).toList();

      int totalEntregasRecibidas = 0;
      for (final list in _entregasGradebook.values) {
        totalEntregasRecibidas += list.length;
      }

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Resumen de Métricas del Gradebook
          Row(
            children: [
              _buildMetricCard('Estudiantes', '${admitidos.length}', AppTheme.accent, isDark),
              const SizedBox(width: 8),
              _buildMetricCard('Tareas', '${allTareas.length}', Colors.blue, isDark),
              const SizedBox(width: 8),
              _buildMetricCard('Entregas', '$totalEntregasRecibidas', const Color(0xFF10B981), isDark),
            ],
          ),
          const SizedBox(height: 14),

          // Header y Buscador
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Libro Central de Calificaciones',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Matriz de notas por estudiante y tarea académica.',
                              style: TextStyle(fontSize: 11, color: AppTheme.inkSoft),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.download_rounded, size: 20, color: AppTheme.accent),
                            tooltip: 'Exportar libro de calificaciones (CSV)',
                            onPressed: _exportarLibroCalificacionesCSV,
                          ),
                          IconButton(
                            icon: const Icon(Icons.refresh_rounded, size: 20, color: AppTheme.accent),
                            tooltip: 'Recargar notas',
                            onPressed: _loadGradebookData,
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    onChanged: (val) => setState(() => _searchGradebookQuery = val),
                    decoration: InputDecoration(
                      hintText: 'Buscar por estudiante o equipo...',
                      prefixIcon: const Icon(Icons.search, size: 18),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      fillColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                      filled: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          if (filteredStudents.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  admitidos.isEmpty
                      ? 'No hay estudiantes admitidos aún en esta materia.'
                      : 'No se encontraron estudiantes para "$_searchGradebookQuery".',
                  style: const TextStyle(fontSize: 12, color: AppTheme.inkSoft),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          else
            ...filteredStudents.map((est) {
              final nombre = _formatNombre(est);
              final email = (est['email'] ?? '').toString();
              final foto = est['fotoPerfil'] as String?;
              final grupo = _formatGrupo(est);
              final uId = (est['usuarioId'] as num?)?.toInt() ?? 0;

              double sumNotas = 0;
              int countCalificadas = 0;

              final List<Widget> tareaBadges = [];

              for (final t in allTareas) {
                final entregasDeTarea = _entregasGradebook[t.id] ?? [];
                final entregaEstudiante = entregasDeTarea.firstWhere(
                  (ent) => ent['estudianteId'] == uId || ent['usuarioId'] == uId || ent['estudianteEmail'] == email,
                  orElse: () => <String, dynamic>{},
                );

                if (entregaEstudiante.isNotEmpty) {
                  final calif = (entregaEstudiante['calificacion'] as num?)?.toDouble();
                  if (calif != null) {
                    sumNotas += calif;
                    countCalificadas++;
                    tareaBadges.add(
                      InkWell(
                        onTap: (isDocente || isJurado) ? () => widget.onOpenSpeedGrader(t.id) : null,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          margin: const EdgeInsets.only(right: 6, bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            '${t.titulo}: ${calif.toStringAsFixed(0)}/${t.puntajeMaximo?.toStringAsFixed(0) ?? "100"}',
                            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                          ),
                        ),
                      ),
                    );
                  } else {
                    tareaBadges.add(
                      InkWell(
                        onTap: (isDocente || isJurado) ? () => widget.onOpenSpeedGrader(t.id) : null,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          margin: const EdgeInsets.only(right: 6, bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.amber.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            '${t.titulo}: Pendiente',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Colors.amber.shade800),
                          ),
                        ),
                      ),
                    );
                  }
                } else {
                  tareaBadges.add(
                    Container(
                      margin: const EdgeInsets.only(right: 6, bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperSunken,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                      ),
                      child: Text(
                        '${t.titulo}: Sin entrega',
                        style: const TextStyle(fontSize: 10.5, color: AppTheme.inkFaint),
                      ),
                    ),
                  );
                }
              }

              final promedio = countCalificadas > 0 ? (sumNotas / countCalificadas) : 0.0;

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _buildAvatar(nombre, foto, 'ESTUDIANTE'),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(nombre, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                              if (grupo.isNotEmpty)
                                Text(grupo, style: const TextStyle(fontSize: 10.5, color: AppTheme.accent, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: countCalificadas > 0
                                ? (promedio >= 51 ? const Color(0xFF10B981).withValues(alpha: 0.15) : Colors.red.withValues(alpha: 0.15))
                                : AppTheme.accentSoft,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            countCalificadas > 0 ? '${promedio.toStringAsFixed(1)} pts' : 'Sin notas',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: countCalificadas > 0
                                  ? (promedio >= 51 ? const Color(0xFF10B981) : Colors.red)
                                  : AppTheme.inkSoft,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (tareaBadges.isNotEmpty)
                      Wrap(children: tareaBadges)
                    else
                      const Text('No hay tareas registradas en este curso.', style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.inkFaint)),
                  ],
                ),
              );
            }),
        ],
      );
    } else {
      // Vista Estudiante: Reporte personal de calificaciones
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.workspace_premium_rounded, color: AppTheme.accent, size: 22),
                      SizedBox(width: 8),
                      Text('Mis Calificaciones y Retroalimentación', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text('Historial de entregas y notas obtenidas en esta convocatoria.', style: TextStyle(fontSize: 11, color: AppTheme.inkSoft)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (allTareas.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(
                child: Text('Aún no hay tareas publicadas.', style: TextStyle(fontSize: 12, color: AppTheme.inkSoft)),
              ),
            )
          else
            ...allTareas.map((tarea) {
              final tieneNota = tarea.calificacion != null;
              final entregada = tarea.estadoEntrega == 'ENTREGADO' || tarea.estadoEntrega == 'CALIFICADO';

              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              tarea.titulo,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: tieneNota
                                  ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                  : (entregada ? Colors.amber.withValues(alpha: 0.15) : (isDark ? AppTheme.darkLine : AppTheme.line)),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              tieneNota
                                  ? '${tarea.calificacion!.toStringAsFixed(1)} / ${tarea.puntajeMaximo?.toStringAsFixed(0) ?? "100"}'
                                  : (entregada ? 'Entregada • Pendiente' : 'Sin entregar'),
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                                color: tieneNota
                                    ? const Color(0xFF10B981)
                                    : (entregada ? Colors.amber.shade800 : AppTheme.inkFaint),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (tarea.retroalimentacion != null && tarea.retroalimentacion!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Retroalimentación del Docente:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.accent)),
                              const SizedBox(height: 2),
                              Text(tarea.retroalimentacion!, style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInk : AppTheme.ink)),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),
        ],
      );
    }
  }
}
