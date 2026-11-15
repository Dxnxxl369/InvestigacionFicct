import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/api_service.dart';
import 'crear_convocatoria_screen.dart';

class AgenteConvocatoriaScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final Map<String, dynamic>? borradorInicial;

  const AgenteConvocatoriaScreen({
    super.key,
    this.onBack,
    this.borradorInicial,
  });

  @override
  State<AgenteConvocatoriaScreen> createState() => _AgenteConvocatoriaScreenState();
}

class _AgenteConvocatoriaScreenState extends State<AgenteConvocatoriaScreen> {
  final TextEditingController _mensajeCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();

  // Historial de mensajes en el chat
  final List<Map<String, String>> _mensajes = [];

  // Borrador activo que la IA va armando
  Map<String, dynamic> _borrador = {
    'tipo': 'HACKATHON',
    'modalidadInscripcion': 'GRUPAL',
    'titulo': '',
    'descripcion': '',
    'fechaFinInscripcion': '2026-11-15',
    'cuposMinEquipo': 2,
    'cuposMaxEquipo': 5,
    'requisitos': <String>[],
    'selectedDocenteIds': <int>[],
  };

  List<String> _camposFaltantes = ['titulo', 'descripcion', 'docenteEncargado'];
  List<Map<String, dynamic>> _docentesDisponibles = [];
  int _progreso = 10;
  bool _enviando = false;
  bool _mostrarResumen = true;

  @override
  void initState() {
    super.initState();
    if (widget.borradorInicial != null) {
      _borrador = Map<String, dynamic>.from(widget.borradorInicial!);
    }

    // Mensaje de bienvenida inicial del Agente
    _mensajes.add({
      'remitente': 'AGENTE',
      'texto':
          '¡Hola! Soy tu asistente para la creación de convocatorias institucionales. '
          'Descríbeme qué tipo de evento deseas organizar (por ejemplo: "Quiero crear la Feria de Ciencias e Innovación 2026 para grupos de 2 a 4 alumnos"). '
          'Iré estructurando el formulario por ti en tiempo real.',
    });

    _cargarDocentesIniciales();
  }

  Future<void> _cargarDocentesIniciales() async {
    final encargados = await ApiService.getEncargadosDisponibles();
    if (mounted) {
      final docs = encargados['docentes'] as List<dynamic>? ?? [];
      setState(() {
        _docentesDisponibles = docs.map((d) => Map<String, dynamic>.from(d as Map)).toList();
      });
    }
  }

  @override
  void dispose() {
    _mensajeCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollHaciaAbajo() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _enviarMensaje([String? mensajeManual]) async {
    final texto = (mensajeManual ?? _mensajeCtrl.text).trim();
    if (texto.isEmpty || _enviando) return;

    _mensajeCtrl.clear();
    setState(() {
      _mensajes.add({'remitente': 'USUARIO', 'texto': texto});
      _enviando = true;
    });
    _scrollHaciaAbajo();

    final resp = await ApiService.chatAgenteConvocatoria(
      mensaje: texto,
      estadoActual: _borrador,
      historial: _mensajes,
    );

    if (!mounted) return;

    final mensajeAgente = resp['mensajeAgente']?.toString() ??
        'Entendido. He actualizado los datos de la convocatoria.';
    final borradorActualizado = resp['borradorActualizado'];
    final faltantes = (resp['camposFaltantes'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];
    final progreso = (resp['porcentajeProgreso'] as num?)?.toInt() ?? _progreso;

    final docs = resp['docentesDisponibles'] as List<dynamic>?;
    if (docs != null && docs.isNotEmpty) {
      _docentesDisponibles = docs.map((d) => Map<String, dynamic>.from(d as Map)).toList();
    }

    setState(() {
      _mensajes.add({'remitente': 'AGENTE', 'texto': mensajeAgente});
      if (borradorActualizado is Map) {
        _borrador = Map<String, dynamic>.from(borradorActualizado);
      }
      _camposFaltantes = faltantes;
      _progreso = progreso;
      _enviando = false;
    });

    _scrollHaciaAbajo();
  }

  void _asignarDocente(Map<String, dynamic> doc) {
    final docId = (doc['id'] as num?)?.toInt();
    final nombre = doc['nombreCompleto']?.toString() ?? 'Docente';
    if (docId == null) return;

    final ids = List<int>.from(_borrador['selectedDocenteIds'] ?? []);
    if (!ids.contains(docId)) {
      ids.add(docId);
      setState(() {
        _borrador['selectedDocenteIds'] = ids;
        _borrador['docenteSugeridoNombre'] = nombre;
      });
      _enviarMensaje('Asignar al docente $nombre');
    }
  }

  void _abrirFormularioCompleto() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => CrearConvocatoriaScreen(
          onBack: () => Navigator.of(ctx).pop(),
          initialDraft: _borrador,
        ),
      ),
    );
  }

  Future<void> _guardarBorradorDirecto() async {
    final titulo = _borrador['titulo']?.toString().trim() ?? '';
    if (titulo.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Por favor define al menos un título para la convocatoria.'),
          backgroundColor: AppTheme.danger,
        ),
      );
      return;
    }

    final Map<String, dynamic> datos = {
      'titulo': titulo,
      'descripcion': _borrador['descripcion'] ?? '',
      'tipo': _borrador['tipo'] ?? 'FERIA',
      'modalidadInscripcion': _borrador['modalidadInscripcion'] ?? 'GRUPAL',
      'estado': 'BORRADOR',
      'cuposMinEquipo': _borrador['cuposMinEquipo'] ?? 2,
      'cuposMaxEquipo': _borrador['cuposMaxEquipo'] ?? 5,
      'fechaCierre': _borrador['fechaFinInscripcion'] != null
          ? '${_borrador['fechaFinInscripcion']}T23:59:59'
          : null,
      'requisitos': _borrador['requisitos'] ?? [],
      'docenteIds': _borrador['selectedDocenteIds'] ?? [],
    };

    final res = await ApiService.crearConvocatoria(datos);
    if (!mounted) return;

    if (res != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Borrador "$titulo" guardado exitosamente.'),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
      Navigator.of(context).pop(true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo guardar la convocatoria.'),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: widget.onBack ?? () => Navigator.of(context).pop(),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.accent, Color(0xFF6366F1)],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Agente Convocatorias', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  Text(
                    'Asistente Inteligente • Groq Engine',
                    style: TextStyle(fontSize: 10, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(_mostrarResumen ? Icons.visibility_rounded : Icons.visibility_off_rounded),
            tooltip: _mostrarResumen ? 'Ocultar panel de avance' : 'Mostrar panel de avance',
            onPressed: () => setState(() => _mostrarResumen = !_mostrarResumen),
          ),
          TextButton.icon(
            icon: const Icon(Icons.open_in_new_rounded, size: 16, color: AppTheme.accent),
            label: const Text('Editar', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.accent)),
            onPressed: _abrirFormularioCompleto,
          ),
        ],
      ),
      body: Column(
        children: [
          // PANEL SUPERIOR DE PROGRESO Y BORRADOR ACTIVO
          if (_mostrarResumen) _buildPanelProgreso(isDark),

          // CHIPS DE DOCENTES ACTIVOS SUGERIDOS
          if (_docentesDisponibles.isNotEmpty) _buildDocentesPills(isDark),

          // CUERPO DEL CHAT
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              itemCount: _mensajes.length + (_enviando ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == _mensajes.length && _enviando) {
                  return _buildBurbujaPensando(isDark);
                }
                final msg = _mensajes[index];
                final esUsuario = msg['remitente'] == 'USUARIO';
                return _buildBurbujaMensaje(msg['texto'] ?? '', esUsuario, isDark);
              },
            ),
          ),

          // SUGERENCIAS RÁPIDAS
          _buildSugerenciasRapidas(isDark),

          // BARRA INFERIOR DE ACCIONES Y ENTRADA DE TEXTO
          _buildBarraInferior(isDark),
        ],
      ),
    );
  }

  Widget _buildPanelProgreso(bool isDark) {
    final titulo = _borrador['titulo']?.toString().trim();
    final tipo = _borrador['tipo']?.toString() ?? 'FERIA';
    final mod = _borrador['modalidadInscripcion']?.toString() ?? 'GRUPAL';
    final cupos = '${_borrador['cuposMinEquipo'] ?? 2} a ${_borrador['cuposMaxEquipo'] ?? 5} integrantes';
    final docente = _borrador['docenteSugeridoNombre']?.toString() ??
        ((_borrador['selectedDocenteIds'] is List && (_borrador['selectedDocenteIds'] as List).isNotEmpty)
            ? 'Docente asignado (ID ${(_borrador['selectedDocenteIds'] as List).first})'
            : null);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
        border: Border(bottom: BorderSide(color: isDark ? AppTheme.darkLine : AppTheme.line)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text('Avance del Formulario: ', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                  Text('$_progreso%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppTheme.accent)),
                ],
              ),
              InkWell(
                onTap: _abrirFormularioCompleto,
                child: const Text(
                  'Ver y Editar Formulario →',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.accent),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (_progreso / 100.0).clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.accent),
            ),
          ),
          const SizedBox(height: 8),

          // Resumen condensado
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              _buildBadge(tipo, AppTheme.accent),
              _buildBadge(mod, Colors.indigo),
              if (titulo != null && titulo.isNotEmpty)
                _buildBadge(titulo, Colors.teal, isDark)
              else
                _buildBadge('Título pendiente', Colors.orange, isDark),
              _buildBadge(cupos, isDark ? Colors.grey : Colors.blueGrey, isDark),
              if (docente != null)
                _buildBadge(docente, const Color(0xFF10B981), isDark)
              else
                _buildBadge('Docente sin asignar', AppTheme.danger, isDark),
            ],
          ),
          if (_camposFaltantes.isNotEmpty) ...[
            const SizedBox(height: 6),
            Wrap(
              spacing: 5,
              runSpacing: 4,
              children: _camposFaltantes.map((f) {
                String desc = f;
                if (f == 'titulo') desc = 'Falta título';
                if (f == 'descripcion') desc = 'Falta descripción';
                if (f == 'docenteEncargado') desc = 'Falta docente encargado';
                if (f == 'requisitos') desc = 'Faltan requisitos';
                if (f == 'fechaFinInscripcion') desc = 'Falta fecha límite';
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.dangerSoft,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    desc,
                    style: const TextStyle(fontSize: 9.5, color: AppTheme.danger, fontWeight: FontWeight.bold),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBadge(String label, Color color, [bool isDark = false]) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  Widget _buildDocentesPills(bool isDark) {
    return Container(
      height: 38,
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
        border: Border(bottom: BorderSide(color: isDark ? AppTheme.darkLine : AppTheme.line)),
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _docentesDisponibles.length,
        itemBuilder: (context, idx) {
          final doc = _docentesDisponibles[idx];
          final nombre = doc['nombreCompleto']?.toString() ?? 'Docente';
          final id = (doc['id'] as num?)?.toInt();
          final asignado = (_borrador['selectedDocenteIds'] is List) &&
              (_borrador['selectedDocenteIds'] as List).contains(id);

          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: InkWell(
              onTap: () => _asignarDocente(doc),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  color: asignado
                      ? const Color(0xFF10B981)
                      : (isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: asignado
                        ? const Color(0xFF10B981)
                        : (isDark ? AppTheme.darkLine : AppTheme.line),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      asignado ? Icons.check_circle_rounded : Icons.person_add_rounded,
                      size: 13,
                      color: asignado ? Colors.white : AppTheme.accent,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      nombre,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: asignado ? Colors.white : (isDark ? AppTheme.darkInk : AppTheme.ink),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBurbujaMensaje(String texto, bool esUsuario, bool isDark) {
    return Align(
      alignment: esUsuario ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: esUsuario
              ? AppTheme.accent
              : (isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised),
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: esUsuario ? const Radius.circular(2) : const Radius.circular(16),
            bottomLeft: !esUsuario ? const Radius.circular(2) : const Radius.circular(16),
          ),
          border: !esUsuario
              ? Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line)
              : null,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!esUsuario)
              const Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.smart_toy_rounded, size: 14, color: AppTheme.accent),
                    SizedBox(width: 4),
                    Text(
                      'Agente IA',
                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppTheme.accent),
                    ),
                  ],
                ),
              ),
            Text(
              texto,
              style: TextStyle(
                fontSize: 13,
                color: esUsuario
                    ? Colors.white
                    : (isDark ? AppTheme.darkInk : AppTheme.ink),
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBurbujaPensando(bool isDark) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accent),
            ),
            SizedBox(width: 8),
            Text('El Agente está redactando...', style: TextStyle(fontSize: 12, color: AppTheme.inkSoft)),
          ],
        ),
      ),
    );
  }

  Widget _buildSugerenciasRapidas(bool isDark) {
    final sugerencias = [
      'Es modalidad Feria Grupal',
      'Asignar docente de la FICCT',
      'Cupos de 3 a 5 estudiantes',
      'Fecha límite: 30 de noviembre',
    ];

    return Container(
      height: 34,
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: sugerencias.length,
        itemBuilder: (context, idx) {
          final sug = sugerencias[idx];
          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: ActionChip(
              label: Text(sug, style: const TextStyle(fontSize: 10.5)),
              backgroundColor: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(horizontal: 6),
              onPressed: () => _enviarMensaje(sug),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBarraInferior(bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
        border: Border(top: BorderSide(color: isDark ? AppTheme.darkLine : AppTheme.line)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _mensajeCtrl,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _enviarMensaje(),
                  decoration: InputDecoration(
                    hintText: 'Describe cambios o detalles para la convocatoria...',
                    hintStyle: const TextStyle(fontSize: 12),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _enviando ? null : () => _enviarMensaje(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.all(12),
                  shape: const CircleBorder(),
                ),
                child: _enviando
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send_rounded, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton.icon(
                icon: const Icon(Icons.save_outlined, size: 16),
                label: const Text('Guardar Borrador', style: TextStyle(fontSize: 11.5)),
                onPressed: _guardarBorradorDirecto,
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.edit_note_rounded, size: 16),
                label: const Text('Ver y Editar en Formulario', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _abrirFormularioCompleto,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
