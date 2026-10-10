import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';
import '../../models/user_model.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/moodle_widgets.dart';
import '../../widgets/confirmar_eliminacion_dialog.dart';
import 'crear_convocatoria_screen.dart';

class ConvocatoriaDetalleScreen extends StatefulWidget {
  final ConvocatoriaModel convocatoria;
  final VoidCallback onBack;
  final Function(ConvocatoriaModel)? onOpenAula;

  const ConvocatoriaDetalleScreen({
    super.key,
    required this.convocatoria,
    required this.onBack,
    this.onOpenAula,
  });

  @override
  State<ConvocatoriaDetalleScreen> createState() => _ConvocatoriaDetalleScreenState();
}

class _ConvocatoriaDetalleScreenState extends State<ConvocatoriaDetalleScreen> {
  UserModel? _currentUser;
  List<Map<String, dynamic>> _participantes = [];
  bool _isLoadingParticipantes = false;
  bool _isActionLoading = false;
  String? _miEstado;

  @override
  void initState() {
    super.initState();
    _miEstado = widget.convocatoria.miEstadoInscripcion;
    _initData();
  }

  Future<void> _initData() async {
    final user = await StorageService.getUser();
    if (mounted) {
      setState(() => _currentUser = user);
    }
    await _refreshDetalleYEstado();
    if (user != null && (user.rol == 'ADMIN' || user.rol == 'DOCENTE')) {
      _loadParticipantes();
    }
  }

  Future<void> _refreshDetalleYEstado() async {
    final detail = await ApiService.getConvocatoriaDetalle(widget.convocatoria.id);
    if (detail != null && mounted) {
      setState(() {
        _miEstado = detail.miEstadoInscripcion;
      });
    } else {
      final misAreas = await ApiService.getMisAreas();
      final match = misAreas.where((a) => a.id == widget.convocatoria.id).firstOrNull;
      if (match != null && mounted) {
        setState(() {
          _miEstado = match.miEstadoInscripcion;
        });
      }
    }
  }

  Future<void> _loadParticipantes() async {
    setState(() => _isLoadingParticipantes = true);
    final list = await ApiService.getParticipantes(widget.convocatoria.id);
    if (mounted) {
      setState(() {
        _participantes = list;
        _isLoadingParticipantes = false;
      });
    }
    _refreshDetalleYEstado();
  }

  Future<void> _handleArchivar() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Archivar Convocatoria'),
        content: Text('¿Desea archivar "${widget.convocatoria.titulo}"? Pasará a modo solo lectura.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.seal),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Archivar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isActionLoading = true);
      final ok = await ApiService.archivarConvocatoria(widget.convocatoria.id);
      if (mounted) {
        setState(() => _isActionLoading = false);
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
    }
  }

  void _handleEliminar() {
    ConfirmarEliminacionDialog.mostrar(
      context: context,
      tipo: TipoEliminacion.convocatoria,
      titulo: widget.convocatoria.titulo,
      totalParticipantes: _participantes.length,
      onArchivar: _handleArchivar,
      onConfirmar: () async {
        setState(() => _isActionLoading = true);
        final res = await ApiService.eliminarConvocatoria(widget.convocatoria.id, forzar: true);
        if (mounted) {
          setState(() => _isActionLoading = false);
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

  Future<void> _handleInscribirse() async {
    if (widget.convocatoria.estado != 'PUBLICADA') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Colors.amber,
          content: Text('Esta convocatoria aún se encuentra en borrador y no admite postulaciones de estudiantes.'),
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.how_to_reg_rounded, color: AppTheme.accent),
            SizedBox(width: 8),
            Text('Postular a Convocatoria', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Estás a punto de postularte a "${widget.convocatoria.titulo}".',
                style: const TextStyle(fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.accent.withValues(alpha: 0.25)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline_rounded, color: AppTheme.accent, size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Tu postulación individual será enviada a los encargados docentes/administradores para su revisión. Una vez admitido, podrás ingresar al Aula Virtual y unirte o conformar tu grupo de trabajo oficial.',
                        style: TextStyle(fontSize: 12, height: 1.35),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirmar Postulación'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isActionLoading = true);

      final ok = await ApiService.inscribirseConvocatoria(
        widget.convocatoria.id,
      );

      if (mounted) {
        setState(() {
          _isActionLoading = false;
          if (ok) _miEstado = 'PENDIENTE';
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: ok ? const Color(0xFF10B981) : AppTheme.danger,
            content: Text(
              ok
                  ? '¡Solicitud de postulación enviada exitosamente!'
                  : 'Error al procesar la postulación.',
            ),
          ),
        );
      }
    }
  }

  Future<void> _handleAdmitir(int participanteId, String nombreEstudiante) async {
    setState(() => _isActionLoading = true);
    final ok = await ApiService.admitirParticipante(widget.convocatoria.id, participanteId);
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
        widget.convocatoria.id,
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

  // Admin: Asignar Docente o Jurado a cargo de la convocatoria
  Future<void> _showAsignarEncargadoModal() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    String rolSeleccionado = 'DOCENTE';
    int? usuarioSeleccionadoId;
    List<Map<String, dynamic>> listaDisponibles = [];
    bool cargando = true;
    bool yaCargo = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          if (!yaCargo) {
            yaCargo = true;
            ApiService.getEncargadosDisponibles().then((data) {
              final docs = data['docentes'] ?? [];
              final jurs = data['jurados'] ?? [];
              if (ctx.mounted) {
                setSheetState(() {
                  cargando = false;
                  listaDisponibles = rolSeleccionado == 'DOCENTE' ? docs : jurs;
                  if (listaDisponibles.isNotEmpty) {
                    usuarioSeleccionadoId = (listaDisponibles.first['id'] as num?)?.toInt();
                  }
                });
              }
            });
          }

          return Container(
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkPaper : AppTheme.paper,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
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
                    const Icon(Icons.person_add_rounded, color: AppTheme.accent),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Asignar Encargado a la Convocatoria',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Selector de Rol: DOCENTE o JURADO (sin desbordamiento)
                Row(
                  children: [
                    Expanded(
                      child: ChoiceChip(
                        avatar: const Icon(Icons.school_rounded, size: 16),
                        label: const Text('Docente', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                        selected: rolSeleccionado == 'DOCENTE',
                        selectedColor: AppTheme.accentSoft,
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                        onSelected: (val) {
                          if (val) {
                            setSheetState(() {
                              rolSeleccionado = 'DOCENTE';
                              yaCargo = false;
                              cargando = true;
                              usuarioSeleccionadoId = null;
                            });
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ChoiceChip(
                        avatar: const Icon(Icons.gavel_rounded, size: 16),
                        label: const Text('Jurado', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                        selected: rolSeleccionado == 'JURADO',
                        selectedColor: AppTheme.sealSoft,
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                        onSelected: (val) {
                          if (val) {
                            setSheetState(() {
                              rolSeleccionado = 'JURADO';
                              yaCargo = false;
                              cargando = true;
                              usuarioSeleccionadoId = null;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                if (cargando)
                  const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: AppTheme.accent)))
                else if (listaDisponibles.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'No hay usuarios disponibles con rol $rolSeleccionado en el sistema.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppTheme.inkSoft, fontSize: 13),
                    ),
                  )
                else ...[
                  DropdownButtonFormField<int>(
                    value: usuarioSeleccionadoId,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: rolSeleccionado == 'DOCENTE' ? 'Seleccionar Docente' : 'Seleccionar Jurado',
                      prefixIcon: Icon(rolSeleccionado == 'DOCENTE' ? Icons.person_rounded : Icons.gavel_rounded),
                    ),
                    items: listaDisponibles.map((u) {
                      final id = (u['id'] as num?)?.toInt() ?? 0;
                      final nombre = '${u['nombre'] ?? ""} ${u['apellido'] ?? ""}'.trim();
                      return DropdownMenuItem<int>(
                        value: id,
                        child: Text(
                          nombre.isNotEmpty ? nombre : (u['email'] ?? 'Usuario'),
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: (val) => setSheetState(() => usuarioSeleccionadoId = val),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: usuarioSeleccionadoId == null
                        ? null
                        : () async {
                            final uid = usuarioSeleccionadoId!;
                            final rol = rolSeleccionado;
                            Navigator.pop(ctx);

                            final ok = await ApiService.designarParticipante(
                              widget.convocatoria.id,
                              usuarioId: uid,
                              rol: rol,
                            );

                            if (mounted) {
                              if (ok) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    backgroundColor: const Color(0xFF10B981),
                                    content: Text('¡$rol asignado exitosamente a la convocatoria!'),
                                  ),
                                );
                                _loadParticipantes();
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    backgroundColor: AppTheme.danger,
                                    content: Text('Error al asignar encargado. Verifica permisos de Administrador.'),
                                  ),
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 13)),
                    child: const Text('Confirmar Designación'),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  // Admin: Desvincular Docente o Jurado de la convocatoria
  Future<void> _handleRemoverParticipante(int participanteId, String nombre, String rol) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desvincular Encargado'),
        content: Text('¿Estás seguro de que deseas desvincular a "$nombre" ($rol) de esta convocatoria?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Desvincular'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final ok = await ApiService.removerParticipante(widget.convocatoria.id, participanteId);
      if (mounted) {
        if (ok) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF10B981),
              content: Text('"$nombre" ha sido desvinculado de la convocatoria.'),
            ),
          );
          _loadParticipantes();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.danger,
              content: Text('No se pudo desvincular al participante.'),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final conv = widget.convocatoria;
    final isAdmin = _currentUser != null && _currentUser!.rol == 'ADMIN';
    final isDocenteOAdmin = _currentUser != null && (_currentUser!.rol == 'ADMIN' || _currentUser!.rol == 'DOCENTE');

    final docentesAsignados = _participantes.where((p) => p['rol'] == 'DOCENTE').toList();
    final juradosAsignados = _participantes.where((p) => p['rol'] == 'JURADO').toList();
    final estudiantes = _participantes.where((p) => p['rol'] == 'ESTUDIANTE' || p['rol'] == null).toList();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: widget.onBack,
        ),
        title: const Text('Detalle de Feria & Convocatoria'),
        actions: [
          if (isAdmin) ...[
            IconButton(
              icon: const Icon(Icons.edit_note_rounded, size: 26),
              tooltip: 'Editar Convocatoria',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (ctx) => CrearConvocatoriaScreen(
                      convocatoriaParaEditar: widget.convocatoria,
                      onBack: () => Navigator.pop(ctx),
                      onSaved: () {
                        _refreshDetalleYEstado();
                      },
                    ),
                  ),
                );
              },
            ),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert_rounded),
              tooltip: 'Opciones de administración',
              onSelected: (val) {
                if (val == 'archivar') _handleArchivar();
                if (val == 'eliminar') _handleEliminar();
              },
              itemBuilder: (ctx) => [
                const PopupMenuItem(
                  value: 'archivar',
                  child: Row(
                    children: [
                      Icon(Icons.archive_outlined, size: 18),
                      SizedBox(width: 8),
                      Text('Archivar Convocatoria'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'eliminar',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.danger),
                      SizedBox(width: 8),
                      Text('Eliminar Convocatoria', style: TextStyle(color: AppTheme.danger)),
                    ],
                  ),
                ),
              ],
            ),
          ],
          const NotificacionBadge(),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.accentSoft,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            conv.tipo,
                            style: const TextStyle(
                              color: AppTheme.accentDark,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: conv.estado == 'PUBLICADA'
                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                : Colors.amber.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            conv.estado,
                            style: TextStyle(
                              color: conv.estado == 'PUBLICADA' ? const Color(0xFF10B981) : Colors.amber.shade800,
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const Spacer(),
                        if (_miEstado != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: _miEstado == 'ACEPTADO'
                                  ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                  : AppTheme.goldSoft,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _miEstado == 'ACEPTADO' ? 'ADMITIDO' : 'PENDIENTE',
                              style: TextStyle(
                                color: _miEstado == 'ACEPTADO' ? const Color(0xFF10B981) : AppTheme.gold,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      conv.titulo,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      conv.descripcion,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // TRIBUNAL Y ENCARGADOS CON ASIGNACIÓN DIRECTA
                    Row(
                      children: [
                        const Text(
                          'TRIBUNAL & ENCARGADOS:',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.inkFaint),
                        ),
                        const Spacer(),
                        if (isAdmin)
                          TextButton.icon(
                            onPressed: _showAsignarEncargadoModal,
                            icon: const Icon(Icons.person_add_alt_1_rounded, size: 14),
                            label: const Text('Asignar Encargado', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Lista de Docentes Asignados
                    if (docentesAsignados.isNotEmpty) ...[
                      const Text(
                        'Docentes a Cargo:',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.accentDark),
                      ),
                      const SizedBox(height: 4),
                      ...docentesAsignados.map((d) {
                        final nombre = '${d['nombre'] ?? ''} ${d['apellidos'] ?? ''}'.trim();
                        final dId = d['id'] as int? ?? 0;
                        final uId = (d['usuarioId'] as num?)?.toInt() ?? 0;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(8),
                            onTap: uId > 0
                                ? () => showPerfilParticipanteModal(
                                      context,
                                      usuarioId: uId,
                                      fallbackNombre: nombre.isNotEmpty ? nombre : 'Docente',
                                      fallbackRol: 'DOCENTE',
                                      fallbackEmail: d['email'],
                                      fallbackFoto: d['fotoPerfil'],
                                    )
                                : null,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                              child: Row(
                                children: [
                                  const CircleAvatar(
                                    radius: 13,
                                    backgroundColor: AppTheme.accent,
                                    child: Icon(Icons.school, size: 14, color: Colors.white),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      nombre.isNotEmpty ? nombre : (d['email'] ?? 'Docente'),
                                      style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInk : AppTheme.ink, fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                  if (isAdmin)
                                    IconButton(
                                      icon: const Icon(Icons.remove_circle_outline_rounded, size: 18, color: AppTheme.danger),
                                      tooltip: 'Desvincular Docente',
                                      constraints: const BoxConstraints(),
                                      padding: const EdgeInsets.all(4),
                                      onPressed: () => _handleRemoverParticipante(dId, nombre.isNotEmpty ? nombre : 'Docente', 'Docente'),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ] else if (conv.docentesEncargados.isNotEmpty) ...[
                      ...conv.docentesEncargados.map((doc) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            const CircleAvatar(
                              radius: 13,
                              backgroundColor: AppTheme.accent,
                              child: Icon(Icons.school, size: 14, color: Colors.white),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '$doc (Docente Encargado)',
                              style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInk : AppTheme.ink),
                            ),
                          ],
                        ),
                      )),
                    ] else
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(
                          'Sin docente asignado aún.',
                          style: TextStyle(fontSize: 11.5, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint, fontStyle: FontStyle.italic),
                        ),
                      ),

                    const SizedBox(height: 8),

                    // Lista de Jurados Asignados
                    if (juradosAsignados.isNotEmpty) ...[
                      const Text(
                        'Jurados Evaluadores:',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.seal),
                      ),
                      const SizedBox(height: 4),
                      ...juradosAsignados.map((j) {
                        final nombre = '${j['nombre'] ?? ''} ${j['apellidos'] ?? ''}'.trim();
                        final jId = j['id'] as int? ?? 0;
                        final uId = (j['usuarioId'] as num?)?.toInt() ?? 0;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(8),
                            onTap: uId > 0
                                ? () => showPerfilParticipanteModal(
                                      context,
                                      usuarioId: uId,
                                      fallbackNombre: nombre.isNotEmpty ? nombre : 'Jurado',
                                      fallbackRol: 'JURADO',
                                      fallbackEmail: j['email'],
                                      fallbackFoto: j['fotoPerfil'],
                                    )
                                : null,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                              child: Row(
                                children: [
                                  const CircleAvatar(
                                    radius: 13,
                                    backgroundColor: AppTheme.seal,
                                    child: Icon(Icons.gavel, size: 14, color: Colors.white),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      nombre.isNotEmpty ? nombre : (j['email'] ?? 'Jurado'),
                                      style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInk : AppTheme.ink, fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                  if (isAdmin)
                                    IconButton(
                                      icon: const Icon(Icons.remove_circle_outline_rounded, size: 18, color: AppTheme.danger),
                                      tooltip: 'Desvincular Jurado',
                                      constraints: const BoxConstraints(),
                                      padding: const EdgeInsets.all(4),
                                      onPressed: () => _handleRemoverParticipante(jId, nombre.isNotEmpty ? nombre : 'Jurado', 'Jurado'),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ] else if (conv.juradosAsignados.isNotEmpty) ...[
                      ...conv.juradosAsignados.map((jur) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            const CircleAvatar(
                              radius: 13,
                              backgroundColor: AppTheme.seal,
                              child: Icon(Icons.gavel, size: 14, color: Colors.white),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '$jur (Jurado Evaluador)',
                              style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInk : AppTheme.ink),
                            ),
                          ],
                        ),
                      )),
                    ],

                    const SizedBox(height: 18),

                    // Botón de Inscripción para Estudiantes o Advertencia si no está publicada
                    if (!isDocenteOAdmin) ...[
                      if (conv.estado != 'PUBLICADA')
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.amber.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.amber.withValues(alpha: 0.35)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.lock_clock_rounded, color: Colors.amber, size: 22),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Convocatoria en Preparación (Borrador): No se admiten postulaciones estudiantiles hasta que sea publicada formalmente en el portal.',
                                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Colors.amber),
                                ),
                              ),
                            ],
                          ),
                        )
                      else if (_miEstado == 'ACEPTADO')
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.school_rounded),
                            label: const Text('🎓 Ingresar al Aula Virtual', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: () {
                              if (widget.onOpenAula != null) {
                                widget.onOpenAula!(widget.convocatoria);
                              }
                            },
                          ),
                        )
                      else if (_miEstado == 'PENDIENTE')
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.amber.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.amber.withValues(alpha: 0.35)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.hourglass_top_rounded, color: Colors.amber, size: 22),
                              SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Solicitud Pendiente de Aprobación',
                                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Colors.amber),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Tu postulación ya fue enviada. El docente a cargo o administrador la revisará para darte acceso formal al Aula Virtual.',
                                      style: TextStyle(fontSize: 11.5),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        )
                      else if (_miEstado == 'RECHAZADO')
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppTheme.danger.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.danger.withValues(alpha: 0.35)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.cancel_outlined, color: AppTheme.danger, size: 22),
                              const SizedBox(width: 10),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Postulación No Admitida',
                                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppTheme.danger),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Tu solicitud anterior fue rechazada por el tribunal.',
                                      style: TextStyle(fontSize: 11.5),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: _isActionLoading ? null : _handleInscribirse,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.danger,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                ),
                                child: const Text('Reintentar', style: TextStyle(fontSize: 11)),
                              ),
                            ],
                          ),
                        )
                      else
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.how_to_reg_rounded),
                            label: const Text('Solicitar Inscripción a la Convocatoria'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.accent,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: _isActionLoading ? null : _handleInscribirse,
                          ),
                        ),
                    ],
                    if (isDocenteOAdmin && widget.onOpenAula != null) ...[
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.school_rounded, color: AppTheme.accent),
                          label: const Text('Ir al Aula Virtual de esta Área', style: TextStyle(fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppTheme.accent),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          onPressed: () => widget.onOpenAula!(widget.convocatoria),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // SECCIÓN GESTIÓN DE PARTICIPANTES ESTUDIANTILES (Para Docente y Admin)
            if (isDocenteOAdmin) ...[
              const SizedBox(height: 20),
              Row(
                children: [
                  const Icon(Icons.people_alt_rounded, size: 20, color: AppTheme.accent),
                  const SizedBox(width: 8),
                  Text(
                    'Postulantes & Estudiantes (${estudiantes.length})',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    onPressed: _loadParticipantes,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_isLoadingParticipantes)
                const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
              else if (estudiantes.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'No hay solicitudes estudiantiles pendientes en esta convocatoria.',
                      style: TextStyle(color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                    ),
                  ),
                )
              else
                ...estudiantes.map((p) {
                  final estado = (p['estadoInscripcion'] ?? '').toString();
                  final nombre = '${p['nombre'] ?? ''} ${p['apellidos'] ?? ''}'.trim();
                  final rol = (p['rol'] ?? 'ESTUDIANTE').toString();
                  final equipo = p['nombreEquipo'] as String?;
                  final pId = p['id'] as int? ?? 0;
                  final uId = (p['usuarioId'] as num?)?.toInt() ?? 0;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: uId > 0
                          ? () => showPerfilParticipanteModal(
                                context,
                                usuarioId: uId,
                                fallbackNombre: nombre.isNotEmpty ? nombre : 'Estudiante',
                                fallbackRol: rol,
                                fallbackEmail: p['email'],
                                fallbackFoto: p['fotoPerfil'],
                              )
                          : null,
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: rol == 'DOCENTE' ? AppTheme.accent : AppTheme.seal,
                                  child: Text(
                                    nombre.isNotEmpty ? nombre.substring(0, 1) : 'U',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        nombre,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                    Text(
                                      '${p['email'] ?? ''} • $rol',
                                      style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                                    ),
                                    if (equipo != null && equipo.isNotEmpty)
                                      Text(
                                        'Equipo: $equipo',
                                        style: const TextStyle(fontSize: 11, color: AppTheme.accent, fontWeight: FontWeight.bold),
                                      ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: estado == 'ACEPTADO'
                                      ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                      : estado == 'RECHAZADO'
                                          ? AppTheme.dangerSoft
                                          : AppTheme.goldSoft,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  estado,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: estado == 'ACEPTADO'
                                        ? const Color(0xFF10B981)
                                        : estado == 'RECHAZADO'
                                            ? AppTheme.danger
                                            : AppTheme.gold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (estado == 'RECHAZADO' && p['motivoRechazo'] != null && (p['motivoRechazo'] as String).isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Motivo: ${p['motivoRechazo']}',
                              style: const TextStyle(fontSize: 11, color: AppTheme.danger, fontStyle: FontStyle.italic),
                            ),
                          ],
                          if (estado == 'PENDIENTE') ...[
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppTheme.danger,
                                    side: const BorderSide(color: AppTheme.danger),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  ),
                                  icon: const Icon(Icons.close_rounded, size: 14),
                                  label: const Text('Rechazar', style: TextStyle(fontSize: 11)),
                                  onPressed: _isActionLoading ? null : () => _handleRechazar(pId, nombre),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF10B981),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                  ),
                                  icon: const Icon(Icons.check_rounded, size: 14),
                                  label: const Text('Admitir', style: TextStyle(fontSize: 11)),
                                  onPressed: _isActionLoading ? null : () => _handleAdmitir(pId, nombre),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
  }
}
