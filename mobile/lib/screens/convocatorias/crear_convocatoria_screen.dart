import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';
import '../../services/api_service.dart';

class CrearConvocatoriaScreen extends StatefulWidget {
  final VoidCallback onBack;
  final ConvocatoriaModel? convocatoriaParaEditar;
  final VoidCallback? onSaved;

  const CrearConvocatoriaScreen({
    super.key,
    required this.onBack,
    this.convocatoriaParaEditar,
    this.onSaved,
  });

  @override
  State<CrearConvocatoriaScreen> createState() => _CrearConvocatoriaScreenState();
}

class _CrearConvocatoriaScreenState extends State<CrearConvocatoriaScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tituloCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _urlImagenCtrl = TextEditingController();

  // Entrada numérica natural estricta (Only INT)
  final _cuposMinCtrl = TextEditingController(text: '1');
  final _cuposMaxCtrl = TextEditingController(text: '4');

  final _nuevaRestriccionCtrl = TextEditingController();
  List<String> _restricciones = [
    'Estudiante regular activo de la Facultad FICCT',
    'Promedio ponderado acumulado ≥ 70',
    'Carta de aval del docente guía del proyecto',
  ];

  String _tipo = 'FERIA';
  DateTime _fechaCierre = DateTime.now().add(const Duration(days: 30));
  bool _publicarInmediatamente = true;
  bool _isSubmitting = false;
  bool _isUploadingImage = false;
  String? _imagenSeleccionada;
  int _modoImagen = 0; // 0: Prediseñadas, 1: URL Personalizada, 2: Subir Archivo

  // Catálogo de docentes y jurados de la base de datos
  List<Map<String, dynamic>> _docentesDisponibles = [];
  List<Map<String, dynamic>> _juradosDisponibles = [];
  final Set<int> _selectedDocenteIds = {};
  final Set<int> _selectedJuradoIds = {};
  bool _cargandoEncargados = true;

  bool get isEditing => widget.convocatoriaParaEditar != null;

  final List<Map<String, String>> _imagenesPredeterminadas = [
    {
      'label': 'Feria de Ciencias & Robótica',
      'url': 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    },
    {
      'label': 'Hackathon Tecnológico',
      'url': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    },
    {
      'label': 'Concurso de Programación',
      'url': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    },
    {
      'label': 'Investigación & Grado',
      'url': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
    },
  ];

  @override
  void initState() {
    super.initState();
    if (isEditing) {
      final c = widget.convocatoriaParaEditar!;
      _tituloCtrl.text = c.titulo;
      _descCtrl.text = c.descripcion;
      _tipo = c.tipo;
      _publicarInmediatamente = c.estado == 'PUBLICADA';
      _imagenSeleccionada = c.imagenPortada ?? _imagenesPredeterminadas[0]['url'];
      _urlImagenCtrl.text = c.imagenPortada ?? '';
      _restricciones = List.from(c.requisitos);

      if (c.fechaCierre != null) {
        try {
          _fechaCierre = DateTime.parse(c.fechaCierre!);
        } catch (_) {}
      }

      if (c.tamanoEquipo != null) {
        final matches = RegExp(r'\d+').allMatches(c.tamanoEquipo!).map((m) => m.group(0)!).toList();
        if (matches.length >= 2) {
          _cuposMinCtrl.text = matches[0];
          _cuposMaxCtrl.text = matches[1];
        } else if (matches.length == 1) {
          _cuposMinCtrl.text = '1';
          _cuposMaxCtrl.text = matches[0];
        }
      }

      _selectedDocenteIds.addAll(c.docenteIds);
      _selectedJuradoIds.addAll(c.juradoIds);
    } else {
      _imagenSeleccionada = _imagenesPredeterminadas[0]['url'];
    }
    _cargarEncargados();
  }

  @override
  void dispose() {
    _tituloCtrl.dispose();
    _descCtrl.dispose();
    _urlImagenCtrl.dispose();
    _cuposMinCtrl.dispose();
    _cuposMaxCtrl.dispose();
    _nuevaRestriccionCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargarEncargados() async {
    setState(() => _cargandoEncargados = true);
    final data = await ApiService.getEncargadosDisponibles();
    if (mounted) {
      setState(() {
        _docentesDisponibles = data['docentes'] ?? [];
        _juradosDisponibles = data['jurados'] ?? [];
      });

      // Si estamos editando y los IDs no venían en el objeto, consultar los participantes asignados
      if (isEditing && _selectedDocenteIds.isEmpty && _selectedJuradoIds.isEmpty) {
        final partes = await ApiService.getParticipantes(widget.convocatoriaParaEditar!.id);
        if (mounted) {
          setState(() {
            for (final p in partes) {
              final uid = (p['usuarioId'] ?? p['id'] as num?)?.toInt();
              if (uid != null) {
                if (p['rol'] == 'DOCENTE') _selectedDocenteIds.add(uid);
                if (p['rol'] == 'JURADO') _selectedJuradoIds.add(uid);
              }
            }
          });
        }
      } else if (!isEditing && _selectedDocenteIds.isEmpty && _docentesDisponibles.isNotEmpty) {
        // Seleccionar primer docente por defecto en nueva creación
        final firstId = (_docentesDisponibles.first['id'] as num?)?.toInt();
        if (firstId != null) _selectedDocenteIds.add(firstId);
      }

      if (mounted) {
        setState(() => _cargandoEncargados = false);
      }
    }
  }

  void _agregarRestriccion() {
    final text = _nuevaRestriccionCtrl.text.trim();
    if (text.isNotEmpty && !_restricciones.contains(text)) {
      setState(() {
        _restricciones.add(text);
        _nuevaRestriccionCtrl.clear();
      });
    }
  }

  void _eliminarRestriccion(int index) {
    setState(() {
      _restricciones.removeAt(index);
    });
  }

  Future<void> _selectFechaCierre() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _fechaCierre,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      helpText: 'SELECCIONAR FECHA LÍMITE',
      confirmText: 'CONFIRMAR',
      cancelText: 'CANCELAR',
    );
    if (picked != null) {
      setState(() => _fechaCierre = picked);
    }
  }

  // Selector Modal con Buscador en Vivo para Múltiples Docentes
  Future<void> _showBuscarDocentesModal() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    String searchQuery = '';

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final filtrados = _docentesDisponibles.where((doc) {
            final nombre = '${doc['nombre'] ?? ""} ${doc['apellido'] ?? ""}'.toLowerCase();
            final email = (doc['email'] ?? '').toString().toLowerCase();
            final q = searchQuery.toLowerCase().trim();
            return nombre.contains(q) || email.contains(q);
          }).toList();

          return Container(
            height: MediaQuery.of(ctx).size.height * 0.75,
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkPaper : AppTheme.paper,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            child: Column(
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
                const SizedBox(height: 14),
                Row(
                  children: [
                    const Icon(Icons.school_rounded, color: AppTheme.accent),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Asignar Docentes Encargados',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                      ),
                    ),
                    Text(
                      '${_selectedDocenteIds.length} sel.',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.accent),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Buscar docente por nombre o correo...',
                    prefixIcon: const Icon(Icons.search_rounded),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    filled: true,
                    fillColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                  ),
                  onChanged: (val) => setSheetState(() => searchQuery = val),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: filtrados.isEmpty
                      ? const Center(
                          child: Text(
                            'No se encontraron docentes con ese criterio.',
                            style: TextStyle(color: AppTheme.inkSoft, fontSize: 13),
                          ),
                        )
                      : ListView.separated(
                          itemCount: filtrados.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, idx) {
                            final doc = filtrados[idx];
                            final id = (doc['id'] as num?)?.toInt() ?? 0;
                            final nombre = '${doc['nombre'] ?? ""} ${doc['apellido'] ?? ""}'.trim();
                            final email = doc['email'] ?? '';
                            final isSel = _selectedDocenteIds.contains(id);

                            return CheckboxListTile(
                              value: isSel,
                              activeColor: AppTheme.accent,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              title: Text(
                                nombre.isNotEmpty ? nombre : email,
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
                              ),
                              subtitle: Text(email, style: const TextStyle(fontSize: 11.5, color: AppTheme.inkSoft)),
                              secondary: CircleAvatar(
                                radius: 18,
                                backgroundColor: isSel ? AppTheme.accentSoft : (isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken),
                                child: Text(
                                  nombre.isNotEmpty ? nombre[0].toUpperCase() : 'D',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: isSel ? AppTheme.accentDark : AppTheme.inkSoft,
                                  ),
                                ),
                              ),
                              onChanged: (val) {
                                setSheetState(() {
                                  if (val == true) {
                                    _selectedDocenteIds.add(id);
                                  } else {
                                    _selectedDocenteIds.remove(id);
                                  }
                                });
                                setState(() {});
                              },
                            );
                          },
                        ),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                  ),
                  child: Text('Confirmar Selección (${_selectedDocenteIds.length})'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // Selector Modal con Buscador en Vivo para Jurados
  Future<void> _showBuscarJuradosModal() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    String searchQuery = '';

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final filtrados = _juradosDisponibles.where((jur) {
            final nombre = '${jur['nombre'] ?? ""} ${jur['apellido'] ?? ""}'.toLowerCase();
            final email = (jur['email'] ?? '').toString().toLowerCase();
            final q = searchQuery.toLowerCase().trim();
            return nombre.contains(q) || email.contains(q);
          }).toList();

          return Container(
            height: MediaQuery.of(ctx).size.height * 0.75,
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkPaper : AppTheme.paper,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            child: Column(
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
                const SizedBox(height: 14),
                Row(
                  children: [
                    const Icon(Icons.gavel_rounded, color: AppTheme.seal),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Asignar Jurados Evaluadores',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                      ),
                    ),
                    Text(
                      '${_selectedJuradoIds.length} sel.',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.seal),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Buscar jurado por nombre o correo...',
                    prefixIcon: const Icon(Icons.search_rounded),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    filled: true,
                    fillColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                  ),
                  onChanged: (val) => setSheetState(() => searchQuery = val),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: filtrados.isEmpty
                      ? const Center(
                          child: Text(
                            'No se encontraron jurados con ese criterio.',
                            style: TextStyle(color: AppTheme.inkSoft, fontSize: 13),
                          ),
                        )
                      : ListView.separated(
                          itemCount: filtrados.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, idx) {
                            final jur = filtrados[idx];
                            final id = (jur['id'] as num?)?.toInt() ?? 0;
                            final nombre = '${jur['nombre'] ?? ""} ${jur['apellido'] ?? ""}'.trim();
                            final email = jur['email'] ?? '';
                            final isSel = _selectedJuradoIds.contains(id);

                            return CheckboxListTile(
                              value: isSel,
                              activeColor: AppTheme.seal,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              title: Text(
                                nombre.isNotEmpty ? nombre : email,
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
                              ),
                              subtitle: Text(email, style: const TextStyle(fontSize: 11.5, color: AppTheme.inkSoft)),
                              secondary: CircleAvatar(
                                radius: 18,
                                backgroundColor: isSel ? AppTheme.accentSoft : (isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken),
                                child: Text(
                                  nombre.isNotEmpty ? nombre[0].toUpperCase() : 'J',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: isSel ? AppTheme.seal : AppTheme.inkSoft,
                                  ),
                                ),
                              ),
                              onChanged: (val) {
                                setSheetState(() {
                                  if (val == true) {
                                    _selectedJuradoIds.add(id);
                                  } else {
                                    _selectedJuradoIds.remove(id);
                                  }
                                });
                                setState(() {});
                              },
                            );
                          },
                        ),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.seal,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                  ),
                  child: Text('Confirmar Selección (${_selectedJuradoIds.length})'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // Subir imagen real desde el dispositivo usando FilePicker
  Future<void> _pickAndUploadImage() async {
    try {
      final result = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        if (file.bytes == null) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('No se pudieron leer los datos del archivo seleccionado.')),
            );
          }
          return;
        }

        setState(() => _isUploadingImage = true);

        final uploadRes = await ApiService.subirImagen(file.bytes!, file.name);

        if (mounted) {
          setState(() => _isUploadingImage = false);

          if (uploadRes != null && (uploadRes['url'] != null || uploadRes['relativePath'] != null)) {
            final finalUrl = uploadRes['url'] ?? uploadRes['relativePath'];
            setState(() {
              _imagenSeleccionada = finalUrl;
              _urlImagenCtrl.text = finalUrl;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: Color(0xFF10B981),
                content: Text('¡Imagen de portada subida exitosamente al servidor!'),
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: AppTheme.danger,
                content: Text('Error al subir la imagen al servidor. Verifica el formato.'),
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingImage = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: AppTheme.danger, content: Text('Error al seleccionar archivo: $e')),
        );
      }
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final cuposMin = int.tryParse(_cuposMinCtrl.text.trim()) ?? 1;
    final cuposMax = int.tryParse(_cuposMaxCtrl.text.trim()) ?? 4;

    if (cuposMin < 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('El cupo mínimo debe ser un número entero mayor o igual a 1.')),
      );
      return;
    }
    if (cuposMax < cuposMin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('La cantidad máxima de integrantes no puede ser menor al mínimo.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final fechaStr = '${_fechaCierre.year}-${_fechaCierre.month.toString().padLeft(2, '0')}-${_fechaCierre.day.toString().padLeft(2, '0')}';

    final tamanoEquipoStr = cuposMin == cuposMax
        ? 'Hasta $cuposMax integrantes'
        : '$cuposMin a $cuposMax integrantes';

    // Determinar imagen final
    String finalImage = _imagenSeleccionada ?? _imagenesPredeterminadas[0]['url']!;
    if (_modoImagen == 1 && _urlImagenCtrl.text.trim().isNotEmpty) {
      finalImage = _urlImagenCtrl.text.trim();
    }

    final payload = {
      'titulo': _tituloCtrl.text.trim(),
      'descripcion': _descCtrl.text.trim(),
      'tipo': _tipo,
      'fechaCierre': fechaStr,
      'tamanoEquipo': tamanoEquipoStr,
      'imagenPortada': finalImage,
      'requisitos': _restricciones,
      'docenteIds': _selectedDocenteIds.toList(),
      'juradoIds': _selectedJuradoIds.toList(),
    };

    if (isEditing) {
      final id = widget.convocatoriaParaEditar!.id;
      final ok = await ApiService.actualizarConvocatoria(id, payload);

      if (mounted) {
        setState(() => _isSubmitting = false);

        if (ok) {
          if (_publicarInmediatamente && widget.convocatoriaParaEditar!.estado != 'PUBLICADA') {
            await ApiService.publicarConvocatoria(id);
          }

          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF10B981),
              content: Text('¡Convocatoria "${_tituloCtrl.text}" actualizada exitosamente!'),
            ),
          );
          widget.onSaved?.call();
          widget.onBack();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.danger,
              content: Text('Error al actualizar convocatoria. Verifica permisos de Administrador.'),
            ),
          );
        }
      }
    } else {
      final creada = await ApiService.crearConvocatoria(payload);

      if (mounted) {
        if (creada != null) {
          final id = (creada['id'] as num?)?.toInt();

          if (_publicarInmediatamente && id != null) {
            await ApiService.publicarConvocatoria(id);
          }

          if (!mounted) return;
          setState(() => _isSubmitting = false);

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF10B981),
              content: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _publicarInmediatamente
                          ? '¡Convocatoria "${_tituloCtrl.text}" creada y publicada en el portal!'
                          : '¡Convocatoria "${_tituloCtrl.text}" guardada como borrador!',
                    ),
                  ),
                ],
              ),
            ),
          );
          widget.onSaved?.call();
          widget.onBack();
        } else {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.danger,
              content: Text('Error al crear convocatoria. Verifica que tu sesión sea de Administrador.'),
            ),
          );
        }
      }
    }
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
        title: Text(isEditing ? 'Editar Convocatoria' : 'Crear Convocatoria'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 40),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Banner informativo institucional
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.accentSoft,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.admin_panel_settings_rounded, color: AppTheme.accent, size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        isEditing
                            ? 'Edición Administrativa FICCT: Modifica los parámetros, docentes responsables y requisitos del evento.'
                            : 'Panel de Administración FICCT: Define los parámetros, restricciones y encargados académicos de la nueva convocatoria.',
                        style: const TextStyle(fontSize: 11.5, color: AppTheme.accentDark, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Título
                      TextFormField(
                        controller: _tituloCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Título de la Convocatoria / Feria *',
                          hintText: 'Ej. Feria Científica FICCT 2026 - I',
                          prefixIcon: Icon(Icons.title_rounded),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) return 'El título es obligatorio';
                          if (val.trim().length < 5) return 'Mínimo 5 caracteres';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Tipo de Convocatoria
                      DropdownButtonFormField<String>(
                        value: _tipo,
                        decoration: const InputDecoration(
                          labelText: 'Tipo de Evento Académico',
                          prefixIcon: Icon(Icons.category_rounded),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'FERIA', child: Text('Feria de Ciencias & Robótica')),
                          DropdownMenuItem(value: 'HACKATHON', child: Text('Hackathon Tecnológico')),
                          DropdownMenuItem(value: 'CONCURSO', child: Text('Concurso de Programación')),
                          DropdownMenuItem(value: 'INVESTIGACION', child: Text('Investigación & Taller de Grado')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _tipo = val);
                        },
                      ),
                      const SizedBox(height: 16),

                      // Descripción
                      TextFormField(
                        controller: _descCtrl,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Descripción y Objetivos *',
                          hintText: 'Detalla las metas, público objetivo y lineamientos del evento...',
                          alignLabelWithHint: true,
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) return 'La descripción es obligatoria';
                          if (val.trim().length < 10) return 'Mínimo 10 caracteres';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Fecha Límite de Inscripción
                      InkWell(
                        onTap: _selectFechaCierre,
                        borderRadius: BorderRadius.circular(12),
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Fecha Límite de Postulación / Inscripción',
                            prefixIcon: Icon(Icons.calendar_month_rounded),
                            suffixIcon: Icon(Icons.arrow_drop_down),
                          ),
                          child: Text(
                            '${_fechaCierre.day.toString().padLeft(2, '0')}/${_fechaCierre.month.toString().padLeft(2, '0')}/${_fechaCierre.year}',
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Integrantes por Equipo (Min y Max)
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _cuposMinCtrl,
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                              decoration: const InputDecoration(
                                labelText: 'Mín. Integrantes',
                                prefixIcon: Icon(Icons.person_rounded),
                              ),
                              validator: (val) {
                                final n = int.tryParse(val ?? '');
                                if (n == null || n < 1) return 'Mín 1';
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _cuposMaxCtrl,
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                              decoration: const InputDecoration(
                                labelText: 'Máx. Integrantes',
                                prefixIcon: Icon(Icons.group_rounded),
                              ),
                              validator: (val) {
                                final n = int.tryParse(val ?? '');
                                if (n == null || n < 1) return 'Mín 1';
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      // ==========================================
                      // PARÁMETRO: ASIGNACIÓN DE DOCENTES (MÚLTIPLES)
                      // ==========================================
                      Row(
                        children: [
                          const Icon(Icons.school_rounded, size: 18, color: AppTheme.accent),
                          const SizedBox(width: 6),
                          const Text(
                            'Docentes Responsables',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                          const Spacer(),
                          TextButton.icon(
                            onPressed: _cargandoEncargados ? null : _showBuscarDocentesModal,
                            icon: const Icon(Icons.search_rounded, size: 16),
                            label: const Text('Buscar / Asignar', style: TextStyle(fontSize: 12)),
                          ),
                        ],
                      ),
                      if (_cargandoEncargados)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: LinearProgressIndicator(color: AppTheme.accent),
                        )
                      else if (_selectedDocenteIds.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                          ),
                          child: const Text(
                            'No hay docentes asignados. Presiona "Buscar / Asignar" para seleccionar uno o varios.',
                            style: TextStyle(fontSize: 11.5, color: AppTheme.inkSoft, fontStyle: FontStyle.italic),
                          ),
                        )
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: _selectedDocenteIds.map((id) {
                            final doc = _docentesDisponibles.firstWhere(
                              (d) => ((d['id'] as num?)?.toInt()) == id,
                              orElse: () => {'nombre': 'Docente', 'apellido': '#$id', 'email': ''},
                            );
                            final nombre = '${doc['nombre'] ?? ""} ${doc['apellido'] ?? ""}'.trim();
                            return InputChip(
                              avatar: CircleAvatar(
                                backgroundColor: AppTheme.accent,
                                child: Text(
                                  nombre.isNotEmpty ? nombre[0].toUpperCase() : 'D',
                                  style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                              label: Text(nombre.isNotEmpty ? nombre : doc['email'] ?? 'Docente', style: const TextStyle(fontSize: 11.5)),
                              backgroundColor: AppTheme.accentSoft,
                              deleteIconColor: AppTheme.accentDark,
                              onDeleted: () => setState(() => _selectedDocenteIds.remove(id)),
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 18),

                      // ==========================================
                      // PARÁMETRO: ASIGNACIÓN DE JURADOS (MÚLTIPLES)
                      // ==========================================
                      Row(
                        children: [
                          const Icon(Icons.gavel_rounded, size: 18, color: AppTheme.seal),
                          const SizedBox(width: 6),
                          const Text(
                            'Jurados Evaluadores (Opcional)',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                          const Spacer(),
                          TextButton.icon(
                            onPressed: _cargandoEncargados ? null : _showBuscarJuradosModal,
                            icon: const Icon(Icons.search_rounded, size: 16),
                            label: const Text('Buscar / Asignar', style: TextStyle(fontSize: 12)),
                          ),
                        ],
                      ),
                      if (_selectedJuradoIds.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                          ),
                          child: const Text(
                            'Sin jurados asignados (pueden ser asignados posteriormente).',
                            style: TextStyle(fontSize: 11.5, color: AppTheme.inkSoft, fontStyle: FontStyle.italic),
                          ),
                        )
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: _selectedJuradoIds.map((id) {
                            final jur = _juradosDisponibles.firstWhere(
                              (j) => ((j['id'] as num?)?.toInt()) == id,
                              orElse: () => {'nombre': 'Jurado', 'apellido': '#$id', 'email': ''},
                            );
                            final nombre = '${jur['nombre'] ?? ""} ${jur['apellido'] ?? ""}'.trim();
                            return InputChip(
                              avatar: CircleAvatar(
                                backgroundColor: AppTheme.seal,
                                child: Text(
                                  nombre.isNotEmpty ? nombre[0].toUpperCase() : 'J',
                                  style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                              label: Text(nombre.isNotEmpty ? nombre : jur['email'] ?? 'Jurado', style: const TextStyle(fontSize: 11.5)),
                              backgroundColor: AppTheme.accentSoft,
                              deleteIconColor: AppTheme.seal,
                              onDeleted: () => setState(() => _selectedJuradoIds.remove(id)),
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 18),

                      // ==========================================
                      // PARÁMETRO: FIJAR RESTRICCIONES & REQUISITOS
                      // ==========================================
                      const Row(
                        children: [
                          Icon(Icons.rule_rounded, size: 16, color: AppTheme.accent),
                          SizedBox(width: 6),
                          Text(
                            'Restricciones y Requisitos de Admisión',
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _nuevaRestriccionCtrl,
                              decoration: const InputDecoration(
                                hintText: 'Ej. Presentar aval firmado del tutor...',
                                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              ),
                              onSubmitted: (_) => _agregarRestriccion(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _agregarRestriccion,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.accent,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            ),
                            child: const Icon(Icons.add, size: 18),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Lista de Restricciones añadidas
                      if (_restricciones.isEmpty)
                        const Text(
                          'No hay restricciones fijadas.',
                          style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.inkFaint),
                        )
                      else
                        Column(
                          children: _restricciones.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final req = entry.value;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle_outline, size: 14, color: Color(0xFF10B981)),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      req,
                                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close_rounded, size: 16, color: AppTheme.danger),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    tooltip: 'Eliminar restricción',
                                    onPressed: () => _eliminarRestriccion(idx),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 18),

                      // ==========================================
                      // IMAGEN DE PORTADA (PREDETERMINADA, URL, SUBIDA)
                      // ==========================================
                      const Text(
                        'Imagen de Portada del Evento',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      // Selector de Modo de Imagen
                      SegmentedButton<int>(
                        segments: const [
                          ButtonSegment(value: 0, label: Text('Prediseñadas', style: TextStyle(fontSize: 11))),
                          ButtonSegment(value: 1, label: Text('Por URL', style: TextStyle(fontSize: 11))),
                          ButtonSegment(value: 2, label: Text('Subir Archivo', style: TextStyle(fontSize: 11))),
                        ],
                        selected: {_modoImagen},
                        onSelectionChanged: (val) => setState(() => _modoImagen = val.first),
                      ),
                      const SizedBox(height: 12),

                      if (_modoImagen == 0) ...[
                        SizedBox(
                          height: 72,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: _imagenesPredeterminadas.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 8),
                            itemBuilder: (context, idx) {
                              final img = _imagenesPredeterminadas[idx];
                              final isSel = _imagenSeleccionada == img['url'];
                              return InkWell(
                                onTap: () => setState(() => _imagenSeleccionada = img['url']),
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  width: 90,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: isSel ? AppTheme.accent : (isDark ? AppTheme.darkLine : AppTheme.line),
                                      width: isSel ? 2.5 : 1,
                                    ),
                                    image: DecorationImage(
                                      image: NetworkImage(img['url']!),
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  child: isSel
                                      ? Container(
                                          decoration: BoxDecoration(
                                            color: AppTheme.accent.withValues(alpha: 0.4),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: const Center(
                                            child: Icon(Icons.check_circle, color: Colors.white, size: 24),
                                          ),
                                        )
                                      : null,
                                ),
                              );
                            },
                          ),
                        ),
                      ] else if (_modoImagen == 1) ...[
                        TextFormField(
                          controller: _urlImagenCtrl,
                          decoration: const InputDecoration(
                            labelText: 'URL de la imagen (HTTPS)',
                            hintText: 'https://ejemplo.com/portada.jpg',
                            prefixIcon: Icon(Icons.link_rounded),
                          ),
                          onChanged: (val) => setState(() => _imagenSeleccionada = val.trim()),
                        ),
                        if (_imagenSeleccionada != null && _imagenSeleccionada!.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.network(
                              _imagenSeleccionada!,
                              height: 100,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                height: 60,
                                color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                alignment: Alignment.center,
                                child: const Text('URL inválida o no accesible', style: TextStyle(fontSize: 11, color: AppTheme.danger)),
                              ),
                            ),
                          ),
                        ],
                      ] else ...[
                        OutlinedButton.icon(
                          onPressed: _isUploadingImage ? null : _pickAndUploadImage,
                          icon: _isUploadingImage
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.cloud_upload_rounded),
                          label: Text(_isUploadingImage ? 'Subiendo imagen...' : 'Seleccionar Imagen del Dispositivo'),
                          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                        ),
                        if (_imagenSeleccionada != null && _imagenSeleccionada!.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.network(
                              _imagenSeleccionada!.startsWith('http')
                                  ? _imagenSeleccionada!
                                  : '${ApiService.baseUrl.replaceAll('/api', '')}$_imagenSeleccionada',
                              height: 110,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                height: 60,
                                color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                alignment: Alignment.center,
                                child: const Text('Imagen cargada localmente', style: TextStyle(fontSize: 11, color: AppTheme.accentDark)),
                              ),
                            ),
                          ),
                        ],
                      ],
                      const SizedBox(height: 18),

                      // Switch de Publicar Inmediatamente vs Borrador
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _publicarInmediatamente ? Icons.public_rounded : Icons.edit_note_rounded,
                              color: _publicarInmediatamente ? const Color(0xFF10B981) : Colors.amber,
                              size: 22,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _publicarInmediatamente ? 'Estado: Publicada' : 'Estado: Borrador',
                                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    _publicarInmediatamente
                                        ? 'Visible para todos los estudiantes en el portal y catálogo'
                                        : 'Solo visible en el panel administrativo hasta su publicación',
                                    style: const TextStyle(fontSize: 10, color: AppTheme.inkSoft),
                                  ),
                                ],
                              ),
                            ),
                            Switch(
                              value: _publicarInmediatamente,
                              activeColor: const Color(0xFF10B981),
                              onChanged: (val) => setState(() => _publicarInmediatamente = val),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),

                      // Botón Confirmar (Crear o Guardar Cambios)
                      ElevatedButton(
                        onPressed: _isSubmitting ? null : _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _publicarInmediatamente ? const Color(0xFF10B981) : AppTheme.accent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: _isSubmitting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    isEditing
                                        ? Icons.save_rounded
                                        : (_publicarInmediatamente ? Icons.publish_rounded : Icons.save_rounded),
                                    size: 18,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    isEditing
                                        ? 'Guardar Cambios de la Convocatoria'
                                        : (_publicarInmediatamente ? 'Publicar Convocatoria en Portal' : 'Guardar Convocatoria (Borrador)'),
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
