import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_theme.dart';
import '../../models/tarea_model.dart';
import '../../services/api_service.dart';
import '../../widgets/moodle_widgets.dart';

class SpeedGraderScreen extends StatefulWidget {
  final VoidCallback onBack;
  final int? tareaId;
  final TareaModel? tarea;

  const SpeedGraderScreen({
    super.key,
    required this.onBack,
    this.tareaId,
    this.tarea,
  });

  @override
  State<SpeedGraderScreen> createState() => _SpeedGraderScreenState();
}

class _SpeedGraderScreenState extends State<SpeedGraderScreen> {
  // Datos principales
  TareaModel? _tarea;
  List<Map<String, dynamic>> _allItems = [];
  Map<String, dynamic> _resumen = {};

  // Estado de UI y filtros
  bool _isLoading = true;
  String? _errorCarga;
  String _filtroActivo = 'TODOS'; // TODOS | PENDIENTES | CALIFICADOS | SIN_ENTREGA
  int _currentIndex = 0;

  // Controladores de formulario
  late TextEditingController _notaSimpleCtrl;
  late TextEditingController _feedbackCtrl;
  final Map<int, TextEditingController> _rubricaControllers = {};
  double _sumaRubricaActual = 0.0;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _notaSimpleCtrl = TextEditingController();
    _feedbackCtrl = TextEditingController();
    _cargarDatos();
  }

  @override
  void dispose() {
    _notaSimpleCtrl.dispose();
    _feedbackCtrl.dispose();
    for (final ctrl in _rubricaControllers.values) {
      ctrl.dispose();
    }
    super.dispose();
  }

  Future<void> _cargarDatos() async {
    final tid = widget.tareaId ?? widget.tarea?.id;
    if (tid == null || tid <= 0) {
      setState(() {
        _isLoading = false;
        _errorCarga = 'Identificador de tarea inválido';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorCarga = null;
    });

    try {
      // Cargar tarea y seguimiento en paralelo
      final Future<TareaModel?> tareaFuture = widget.tarea != null
          ? Future.value(widget.tarea)
          : ApiService.getTareaById(tid);
      final Future<Map<String, dynamic>?> segFuture = ApiService.getSeguimientoTarea(tid);

      final results = await Future.wait([tareaFuture, segFuture]);
      final tareaData = results[0] as TareaModel?;
      final segData = results[1] as Map<String, dynamic>?;

      if (!mounted) return;

      if (segData != null) {
        final itemsRaw = segData['items'] as List<dynamic>? ?? [];
        final itemsList = itemsRaw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        final resRaw = segData['resumen'] as Map<String, dynamic>? ?? {};

        setState(() {
          _tarea = tareaData;
          _allItems = itemsList;
          _resumen = Map<String, dynamic>.from(resRaw);
          _isLoading = false;
          _currentIndex = 0;
        });
      } else {
        // Fallback resiliente: obtener entregas simples si el endpoint seguimiento no responde
        final entregas = await ApiService.getEntregasPorTarea(tid);
        final List<Map<String, dynamic>> fallbackItems = entregas.map((e) {
          final calif = e['calificacion'];
          return {
            'estudianteId': e['estudianteId'] ?? 0,
            'estudianteNombre': e['estudianteNombre'] ?? 'Estudiante',
            'estudianteEmail': e['estudianteEmail'] ?? '',
            'fotoPerfil': null,
            'grupoNombre': e['grupoNombre'],
            'estadoSeguimiento': calif != null ? 'CALIFICADO' : 'ENTREGADO',
            'conRetraso': e['conRetraso'] == true,
            'entrega': e,
          };
        }).toList();

        final int califs = fallbackItems.where((i) => i['estadoSeguimiento'] == 'CALIFICADO').length;

        setState(() {
          _tarea = tareaData;
          _allItems = fallbackItems;
          _resumen = {
            'totalEstudiantes': fallbackItems.length,
            'entregados': fallbackItems.length,
            'sinEntregar': 0,
            'calificados': califs,
            'porCalificar': fallbackItems.length - califs,
          };
          _isLoading = false;
          _currentIndex = 0;
        });
      }

      _inicializarFormularioActual();
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorCarga = 'Error al cargar entregas: $e';
        });
      }
    }
  }

  List<Map<String, dynamic>> get _itemsFiltrados {
    switch (_filtroActivo) {
      case 'PENDIENTES':
        return _allItems.where((i) => i['estadoSeguimiento'] == 'ENTREGADO').toList();
      case 'CALIFICADOS':
        return _allItems.where((i) => i['estadoSeguimiento'] == 'CALIFICADO').toList();
      case 'SIN_ENTREGA':
        return _allItems.where((i) => i['estadoSeguimiento'] == 'SIN_ENTREGAR').toList();
      default:
        return _allItems;
    }
  }

  void _inicializarFormularioActual() {
    final filtrados = _itemsFiltrados;
    if (filtrados.isEmpty || _currentIndex >= filtrados.length) {
      _notaSimpleCtrl.text = '';
      _feedbackCtrl.text = '';
      _rubricaControllers.clear();
      _sumaRubricaActual = 0.0;
      return;
    }

    final item = filtrados[_currentIndex];
    final entrega = item['entrega'] as Map<String, dynamic>?;

    final calif = entrega != null ? entrega['calificacion'] : null;
    _notaSimpleCtrl.text = calif != null ? calif.toString() : '';
    _feedbackCtrl.text = (entrega?['retroalimentacion'] ?? '').toString();

    // Rúbrica
    for (final ctrl in _rubricaControllers.values) {
      ctrl.dispose();
    }
    _rubricaControllers.clear();

    final rubrica = _tarea?.rubrica ?? const [];
    if (rubrica.isNotEmpty) {
      double total = 0.0;
      final puntajesExistentes = (entrega?['puntajesCriterios'] as List<dynamic>?) ?? [];

      for (final crit in rubrica) {
        final cid = (crit['id'] as num).toInt();
        final maxCrit = (crit['puntajeMaximo'] as num).toDouble();

        // Buscar puntaje ya guardado o poner inicial
        final match = puntajesExistentes.firstWhere(
          (p) => (p['criterioId'] as num?)?.toInt() == cid,
          orElse: () => null,
        );

        final val = match != null ? (match['puntaje'] as num).toDouble() : (calif != null ? maxCrit : 0.0);
        total += val;

        final ctrl = TextEditingController(text: val > 0 ? val.toString() : '');
        ctrl.addListener(_recalcularTotalRubrica);
        _rubricaControllers[cid] = ctrl;
      }
      _sumaRubricaActual = total;
    }
  }

  void _recalcularTotalRubrica() {
    double total = 0.0;
    for (final ctrl in _rubricaControllers.values) {
      final v = double.tryParse(ctrl.text) ?? 0.0;
      total += v;
    }
    setState(() {
      _sumaRubricaActual = total;
    });
  }

  void _setFiltro(String f) {
    setState(() {
      _filtroActivo = f;
      _currentIndex = 0;
      _inicializarFormularioActual();
    });
  }

  void _irAEstudiante(int index) {
    final filtrados = _itemsFiltrados;
    if (index >= 0 && index < filtrados.length) {
      setState(() {
        _currentIndex = index;
        _inicializarFormularioActual();
      });
    }
  }

  Future<void> _abrirArchivo(String? archivoUrl) async {
    if (archivoUrl == null || archivoUrl.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No hay archivo disponible para abrir.')),
      );
      return;
    }

    final resolved = ApiService.resolveFileUrl(archivoUrl);
    if (resolved == null) return;

    try {
      final uri = Uri.parse(resolved);
      final canOpen = await canLaunchUrl(uri);
      if (canOpen) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('No se pudo abrir el archivo: $e'),
          ),
        );
      }
    }
  }

  Future<void> _verHistorial(int? entregaId) async {
    if (entregaId == null || entregaId <= 0) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(
        child: CircularProgressIndicator(color: AppTheme.accent),
      ),
    );

    final historial = await ApiService.getHistorialEntrega(entregaId);
    if (mounted) {
      Navigator.pop(context); // cerrar spinner
      showHistorialVersionesModal(context, versiones: historial);
    }
  }

  Future<void> _exportarCSV() async {
    final tid = widget.tareaId ?? widget.tarea?.id;
    if (tid == null) return;

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
            Text('Generando reporte CSV de notas...'),
          ],
        ),
      ),
    );

    final csv = await ApiService.exportarNotasTarea(tid);
    if (mounted) {
      if (csv != null && csv.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('Reporte CSV generado correctamente (${csv.split('\n').length - 1} filas).'),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.danger,
            content: const Text('No se pudo descargar el archivo CSV.'),
          ),
        );
      }
    }
  }

  Future<void> _guardarCalificacion() async {
    final filtrados = _itemsFiltrados;
    if (filtrados.isEmpty || _currentIndex >= filtrados.length) return;

    final item = filtrados[_currentIndex];
    final entrega = item['entrega'] as Map<String, dynamic>?;
    final entregaId = (entrega?['id'] as num?)?.toInt();

    if (entregaId == null || entregaId <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.danger,
          content: const Text('Este estudiante no tiene una entrega registrada para calificar.'),
        ),
      );
      return;
    }

    final maximoTarea = _tarea?.puntajeMaximo ?? 100.0;
    final rubrica = _tarea?.rubrica ?? const [];

    setState(() => _isSaving = true);

    Map<String, dynamic> res;

    if (rubrica.isNotEmpty) {
      // Validar cada criterio
      final List<Map<String, dynamic>> puntajesList = [];
      for (final crit in rubrica) {
        final cid = (crit['id'] as num).toInt();
        final maxCrit = (crit['puntajeMaximo'] as num).toDouble();
        final ctrl = _rubricaControllers[cid];
        final val = double.tryParse(ctrl?.text.trim() ?? '') ?? 0.0;

        if (val < 0 || val > maxCrit) {
          setState(() => _isSaving = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppTheme.danger,
              content: Text('Puntaje inválido en criterio "${crit['nombre']}": debe estar entre 0 y $maxCrit.'),
            ),
          );
          return;
        }

        puntajesList.add({'criterioId': cid, 'puntaje': val});
      }

      res = await ApiService.calificarEntregaConRubrica(
        entregaId,
        puntajesCriterios: puntajesList,
        retroalimentacion: _feedbackCtrl.text.trim(),
      );
    } else {
      // Calificación simple
      final nota = double.tryParse(_notaSimpleCtrl.text.trim());
      if (nota == null || nota < 0 || nota > maximoTarea) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('La calificación debe ser un número entre 0 y $maximoTarea pts.'),
          ),
        );
        return;
      }

      res = await ApiService.calificarEntrega(
        entregaId,
        calificacion: nota,
        retroalimentacion: _feedbackCtrl.text.trim(),
      );
    }

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (res['ok'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF10B981),
          content: Text('Calificación de ${item['estudianteNombre']} guardada exitosamente.'),
        ),
      );

      // Recargar datos para actualizar contadores y estados
      await _cargarDatos();

      // Avanzar al siguiente si queda en la lista
      if (_currentIndex < _itemsFiltrados.length - 1) {
        setState(() {
          _currentIndex++;
          _inicializarFormularioActual();
        });
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.danger,
          content: Text(res['error'] ?? 'Error al guardar calificación.'),
        ),
      );
    }
  }

  IconData _getFileIcon(String? filename) {
    if (filename == null) return Icons.insert_drive_file_rounded;
    final lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return Icons.picture_as_pdf_rounded;
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return Icons.description_rounded;
    if (lower.endsWith('.zip') || lower.endsWith('.rar')) return Icons.folder_zip_rounded;
    return Icons.insert_drive_file_rounded;
  }

  Color _getFileColor(String? filename) {
    if (filename == null) return Colors.grey;
    final lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return const Color(0xFFEF4444);
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return const Color(0xFF2563EB);
    if (lower.endsWith('.zip') || lower.endsWith('.rar')) return const Color(0xFFF59E0B);
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: widget.onBack,
          ),
          title: const Text('SpeedGrader'),
        ),
        body: const Center(
          child: CircularProgressIndicator(color: AppTheme.accent),
        ),
      );
    }

    if (_errorCarga != null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: widget.onBack,
          ),
          title: const Text('SpeedGrader'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline_rounded, size: 54, color: AppTheme.danger),
                const SizedBox(height: 14),
                Text(
                  _errorCarga!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _cargarDatos,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final filtrados = _itemsFiltrados;
    final totalEst = (_resumen['totalEstudiantes'] as num?)?.toInt() ?? _allItems.length;
    final totalCal = (_resumen['calificados'] as num?)?.toInt() ?? 0;
    final double progreso = totalEst > 0 ? (totalCal / totalEst).clamp(0.0, 1.0) : 0.0;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: widget.onBack,
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _tarea?.titulo ?? 'SpeedGrader',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              '$totalCal/$totalEst calificados (${(progreso * 100).round()}%)',
              style: const TextStyle(fontSize: 11, color: AppTheme.inkFaint),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded),
            tooltip: 'Exportar Notas a CSV',
            onPressed: _exportarCSV,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refrescar',
            onPressed: _cargarDatos,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: progreso,
            backgroundColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
            color: const Color(0xFF10B981),
            minHeight: 4,
          ),
        ),
      ),
      body: Column(
        children: [
          // Barra de Filtros
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkPaper : AppTheme.paper,
              border: Border(
                bottom: BorderSide(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
              ),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFiltroChip('TODOS', 'Todos (${_allItems.length})'),
                  const SizedBox(width: 6),
                  _buildFiltroChip('PENDIENTES', 'Por Calificar (${_resumen['porCalificar'] ?? 0})'),
                  const SizedBox(width: 6),
                  _buildFiltroChip('CALIFICADOS', 'Calificados (${_resumen['calificados'] ?? 0})'),
                  const SizedBox(width: 6),
                  _buildFiltroChip('SIN_ENTREGA', 'Sin Entrega (${_resumen['sinEntregar'] ?? 0})'),
                ],
              ),
            ),
          ),

          // Paginador de Estudiantes
          if (filtrados.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_rounded, size: 16),
                    onPressed: _currentIndex > 0 ? () => _irAEstudiante(_currentIndex - 1) : null,
                  ),
                  Text(
                    'Estudiante ${_currentIndex + 1} de ${filtrados.length}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onPressed: _currentIndex < filtrados.length - 1 ? () => _irAEstudiante(_currentIndex + 1) : null,
                  ),
                ],
              ),
            ),

          // Contenido principal
          Expanded(
            child: filtrados.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.filter_list_off_rounded, size: 48, color: AppTheme.inkFaint),
                          const SizedBox(height: 12),
                          Text(
                            'No hay estudiantes en este filtro ($_filtroActivo)',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppTheme.darkInk : AppTheme.ink,
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: () => _setFiltro('TODOS'),
                            child: const Text('Ver todos los estudiantes'),
                          ),
                        ],
                      ),
                    ),
                  )
                : _buildEstudianteView(filtrados[_currentIndex], isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildFiltroChip(String key, String label) {
    final activo = _filtroActivo == key;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: activo ? FontWeight.bold : FontWeight.normal,
          color: activo ? Colors.white : null,
        ),
      ),
      selected: activo,
      selectedColor: AppTheme.accent,
      onSelected: (_) => _setFiltro(key),
    );
  }

  Widget _buildEstudianteView(Map<String, dynamic> item, bool isDark) {
    final nombre = (item['estudianteNombre'] ?? 'Estudiante').toString();
    final email = (item['estudianteEmail'] ?? '').toString();
    final grupo = item['grupoNombre'] as String?;
    final estadoSeg = (item['estadoSeguimiento'] ?? 'SIN_ENTREGAR').toString();
    final conRetraso = item['conRetraso'] == true;
    final entrega = item['entrega'] as Map<String, dynamic>?;

    final partes = nombre.split(' ');
    final iniciales = partes.length >= 2
        ? '${partes[0][0]}${partes[1][0]}'.toUpperCase()
        : (nombre.isNotEmpty ? nombre.substring(0, 1).toUpperCase() : 'E');

    final rawUrl = entrega?['archivoUrl'] as String?;
    final rawNombre = entrega?['nombreArchivo'] as String?;
    final List<String> urls = (rawUrl != null && rawUrl.isNotEmpty)
        ? rawUrl.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList()
        : [];
    final List<String> nombres = (rawNombre != null && rawNombre.isNotEmpty)
        ? rawNombre.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList()
        : (rawUrl != null ? ['Archivo adjunto'] : []);
    final fechaEntrega = (entrega?['fechaEntrega'] ?? '').toString().replaceFirst('T', ' ');
    final intentos = (entrega?['intentos'] as num?)?.toInt() ?? 1;

    final tieneRubrica = (_tarea?.rubrica ?? const []).isNotEmpty;
    final maximoTarea = _tarea?.puntajeMaximo ?? 100.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Tarjeta del Estudiante
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: AppTheme.accent,
                        child: Text(
                          iniciales,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              nombre,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppTheme.darkInk : AppTheme.ink,
                              ),
                            ),
                            Text(
                              email,
                              style: const TextStyle(fontSize: 12, color: AppTheme.inkFaint),
                            ),
                          ],
                        ),
                      ),
                      // Estado Badge
                      _buildEstadoBadge(estadoSeg),
                    ],
                  ),
                  if (conRetraso || grupo != null) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        if (grupo != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            margin: const EdgeInsets.only(right: 6),
                            decoration: BoxDecoration(
                              color: AppTheme.accentSoft,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.group_rounded, size: 13, color: AppTheme.accentDark),
                                const SizedBox(width: 4),
                                Text(
                                  grupo,
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.accentDark),
                                ),
                              ],
                            ),
                          ),
                        if (conRetraso)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF97316).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'CON RETRASO',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFEA580C)),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Sección de Archivo Entregado
          if (estadoSeg == 'SIN_ENTREGAR')
            Card(
              color: isDark ? AppTheme.darkPaperSunken : const Color(0xFFFEF2F2),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: Color(0xFFEF4444), size: 26),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Sin entrega registrada',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                          ),
                          Text(
                            'Este estudiante aún no ha enviado ningún archivo en esta actividad académica.',
                            style: TextStyle(fontSize: 11.5, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Archivos Entregados (${nombres.length})',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (nombres.isEmpty)
                      const Text(
                        'No hay archivos adjuntos en esta entrega.',
                        style: TextStyle(fontSize: 12, color: AppTheme.inkSoft),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: nombres.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (ctx, i) {
                          final fName = nombres[i];
                          final fUrl = i < urls.length ? urls[i] : (urls.isNotEmpty ? urls.first : null);

                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            decoration: BoxDecoration(
                              color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                            ),
                            child: Row(
                              children: [
                                Icon(_getFileIcon(fName), color: _getFileColor(fName), size: 24),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    fName,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton.icon(
                                  onPressed: (fUrl != null && fUrl.isNotEmpty) ? () => _abrirArchivo(fUrl) : null,
                                  icon: const Icon(Icons.open_in_new_rounded, size: 14),
                                  label: const Text('Ver', style: TextStyle(fontSize: 11)),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    backgroundColor: AppTheme.accentSoft,
                                    foregroundColor: AppTheme.accentDark,
                                    elevation: 0,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Text(
                          'Entregado: $fechaEntrega',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w500),
                        ),
                        const Spacer(),
                        if (entrega?['id'] != null)
                          OutlinedButton.icon(
                            onPressed: () => _verHistorial((entrega?['id'] as num).toInt()),
                            icon: const Icon(Icons.history_rounded, size: 15),
                            label: Text(
                              intentos > 1 ? 'Historial ($intentos)' : 'Historial',
                              style: const TextStyle(fontSize: 11),
                            ),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),

          // Sección de Calificación
          if (estadoSeg != 'SIN_ENTREGAR')
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Cabecera de Calificación
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          tieneRubrica ? 'Evaluación por Rúbrica' : 'Calificación Final',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.darkInk : AppTheme.ink,
                          ),
                        ),
                        if (!tieneRubrica)
                          Row(
                            children: [
                              SizedBox(
                                width: 70,
                                child: TextField(
                                  controller: _notaSimpleCtrl,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: AppTheme.accent,
                                  ),
                                  decoration: const InputDecoration(
                                    contentPadding: EdgeInsets.symmetric(vertical: 6),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '/ ${maximoTarea.toInt()} pts',
                                style: const TextStyle(fontSize: 13, color: AppTheme.inkFaint),
                              ),
                            ],
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.accentSoft,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Total: $_sumaRubricaActual / ${maximoTarea.toInt()} pts',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.accentDark,
                              ),
                            ),
                          ),
                      ],
                    ),

                    // Criterios de Rúbrica si existen
                    if (tieneRubrica) ...[
                      const SizedBox(height: 14),
                      ...(_tarea!.rubrica).map((crit) {
                        final cid = (crit['id'] as num).toInt();
                        final nombreCrit = (crit['nombre'] ?? 'Criterio').toString();
                        final descCrit = crit['descripcion'] as String?;
                        final maxCrit = (crit['puntajeMaximo'] as num).toDouble();
                        final ctrl = _rubricaControllers[cid];

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          nombreCrit,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                          ),
                                        ),
                                        if (descCrit != null && descCrit.isNotEmpty)
                                          Text(
                                            descCrit,
                                            style: const TextStyle(fontSize: 11, color: AppTheme.inkFaint),
                                          ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  SizedBox(
                                    width: 70,
                                    child: TextFormField(
                                      controller: ctrl,
                                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                      decoration: InputDecoration(
                                        hintText: '0',
                                        suffixText: '/${maxCrit.toInt()}',
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }),
                    ] else ...[
                      // Atajos rápidos de calificación
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            for (final pts in [100, 90, 80, 70, 51]) ...[
                              Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: ActionChip(
                                  label: Text('$pts pts', style: const TextStyle(fontSize: 11)),
                                  backgroundColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                  onPressed: () {
                                    setState(() {
                                      _notaSimpleCtrl.text = pts.toString();
                                    });
                                  },
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 14),
                    Text(
                      'Retroalimentación & Comentarios:',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _feedbackCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: 'Observaciones para el estudiante...',
                      ),
                    ),
                    const SizedBox(height: 18),

                    ElevatedButton.icon(
                      icon: _isSaving
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.check_circle_outline_rounded),
                      label: Text(_isSaving ? 'Guardando...' : 'Guardar y Continuar'),
                      onPressed: _isSaving ? null : _guardarCalificacion,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildEstadoBadge(String estado) {
    Color bg;
    Color text;
    String label;

    switch (estado) {
      case 'CALIFICADO':
        bg = const Color(0xFFD1FAE5);
        text = const Color(0xFF065F46);
        label = 'Calificado';
        break;
      case 'ENTREGADO':
        bg = const Color(0xFFFEF3C7);
        text = const Color(0xFF92400E);
        label = 'Por calificar';
        break;
      default:
        bg = const Color(0xFFFEE2E2);
        text = const Color(0xFF991B1B);
        label = 'Sin entrega';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(color: text, fontSize: 10.5, fontWeight: FontWeight.bold),
      ),
    );
  }
}
