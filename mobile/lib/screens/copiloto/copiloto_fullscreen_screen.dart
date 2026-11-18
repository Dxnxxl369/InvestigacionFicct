import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/app_theme.dart';
import '../../services/api_service.dart';
import '../convocatorias/agente_convocatoria_screen.dart';

class CopilotoFullscreenScreen extends StatefulWidget {
  final String userRole;
  final String userName;
  final int? userId;
  final String rutaActual;
  final Future<void> Function(String ruta) onNavigateRoute;

  const CopilotoFullscreenScreen({
    super.key,
    required this.userRole,
    required this.userName,
    this.userId,
    required this.rutaActual,
    required this.onNavigateRoute,
  });

  @override
  State<CopilotoFullscreenScreen> createState() =>
      _CopilotoFullscreenScreenState();
}

class _CopilotoFullscreenScreenState extends State<CopilotoFullscreenScreen> {
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();

  List<Map<String, dynamic>> _mensajes = [];
  bool _cargando = false;

  String get _cacheKey => 'copiloto_mobile_cache_${widget.userId ?? 0}';

  List<String> get _sugerencias {
    switch (widget.userRole) {
      case 'ESTUDIANTE':
        return [
          'Mis tareas pendientes',
          'Ir a mis aulas',
          'Ver convocatorias',
          'Buscar en biblioteca',
        ];
      case 'DOCENTE':
        return [
          'Entregas por calificar',
          'Mis aulas asignadas',
          'Crear nueva convocatoria',
          'Ir a reportes',
        ];
      case 'JURADO':
        return [
          'Proyectos por evaluar',
          'Ir a mi perfil',
        ];
      default:
        return [
          'Pendientes por revisar',
          'Publicar todas las ferias en borrador',
          'Crear una convocatoria',
          'Ir a reportes',
        ];
    }
  }

  @override
  void initState() {
    super.initState();
    _cargarCache();
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Map<String, dynamic> _mensajeBienvenida() {
    final nombre = widget.userName.split(' ').first;
    return {
      'id': 'welcome',
      'role': 'assistant',
      'content':
          'Hola $nombre, soy tu Copiloto FICCT. Pídeme ver tus pendientes, activar tareas, publicar convocatorias o generar reportes PDF.',
    };
  }

  Future<void> _cargarCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is List && decoded.isNotEmpty) {
          if (!mounted) return;
          setState(() {
            _mensajes = decoded
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          });
          _scrollAlFinal();
          return;
        }
      }
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _mensajes = [_mensajeBienvenida()];
    });
  }

  Future<void> _guardarCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final recortados = _mensajes.length > 25
          ? _mensajes.sublist(_mensajes.length - 25)
          : _mensajes;
      final ligeros = recortados.map((m) {
        final copia = Map<String, dynamic>.from(m);
        if (copia['reporte'] is Map) {
          final rep = Map<String, dynamic>.from(copia['reporte'] as Map);
          rep['pdfBase64'] = '';
          copia['reporte'] = rep;
        }
        return copia;
      }).toList();
      await prefs.setString(_cacheKey, jsonEncode(ligeros));
    } catch (_) {}
  }

  Future<void> _limpiarChat() async {
    setState(() {
      _mensajes = [_mensajeBienvenida()];
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_cacheKey);
    } catch (_) {}
  }

  void _scrollAlFinal() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _enviarMensaje([String? textoDirecto]) async {
    final texto = (textoDirecto ?? _inputCtrl.text).trim();
    if (texto.isEmpty || _cargando) return;

    if (textoDirecto == null) _inputCtrl.clear();

    final historial = _mensajes
        .where((m) => m['id'] != 'welcome')
        .toList()
        .reversed
        .take(8)
        .toList()
        .reversed
        .map((m) => <String, String>{
              'remitente': m['role'] == 'user' ? 'USER' : 'COPILOTO',
              'texto': (m['content'] ?? '').toString(),
            })
        .toList();

    setState(() {
      _mensajes.add({
        'id': 'u-${DateTime.now().millisecondsSinceEpoch}',
        'role': 'user',
        'content': texto,
      });
      _cargando = true;
    });
    _guardarCache();
    _scrollAlFinal();

    final resp = await ApiService.chatCopiloto(
      mensaje: texto,
      historial: historial,
      rutaActual: widget.rutaActual,
    );

    if (!mounted) return;

    final accion = (resp['accion'] ?? 'NONE').toString();
    final msgBot = <String, dynamic>{
      'id': 'b-${DateTime.now().millisecondsSinceEpoch}',
      'role': 'assistant',
      'content': (resp['mensaje'] ?? 'Listo.').toString(),
      if (resp['opciones'] is List && (resp['opciones'] as List).isNotEmpty)
        'opciones': (resp['opciones'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
      if (resp['confirmacionPendiente'] is Map)
        'confirmacion':
            Map<String, dynamic>.from(resp['confirmacionPendiente'] as Map),
      'confirmacionResuelta': false,
      if (resp['reporteGenerado'] is Map)
        'reporte': Map<String, dynamic>.from(resp['reporteGenerado'] as Map),
    };

    setState(() {
      _mensajes.add(msgBot);
      _cargando = false;
    });
    _guardarCache();
    _scrollAlFinal();

    if (accion == 'NAVEGAR' && resp['rutaDestino'] != null) {
      final ruta = resp['rutaDestino'].toString();
      await Future.delayed(const Duration(milliseconds: 500));
      if (!mounted) return;
      Navigator.of(context).pop();
      await widget.onNavigateRoute(ruta);
    } else if (accion == 'ABRIR_AGENTE_CONVOCATORIA') {
      await _abrirHandoffAgenteConvocatoria();
    }
  }

  Future<void> _abrirHandoffAgenteConvocatoria() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(height: 8),
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text(
              'Transfiriendo al Agente IA',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            SizedBox(height: 6),
            Text(
              'Abriendo el asistente para crear tu convocatoria...',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
      ),
    );
    await Future.delayed(const Duration(milliseconds: 850));
    if (!mounted) return;
    Navigator.of(context).pop(); // cerrar dialog
    Navigator.of(context).pop(); // cerrar copiloto fullscreen
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => AgenteConvocatoriaScreen(
          onBack: () => Navigator.of(ctx).pop(),
        ),
      ),
    );
  }

  Future<void> _confirmarAccion(
      String msgId, Map<String, dynamic> conf) async {
    if (_cargando) return;
    List<int>? targetIds;
    if (conf['items'] is List && (conf['items'] as List).isNotEmpty) {
      targetIds = (conf['items'] as List)
          .where((it) => (it as Map)['seleccionado'] == true)
          .map((it) => int.parse((it as Map)['id'].toString()))
          .toList();
      if (targetIds.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Selecciona al menos un elemento para aplicar.')),
        );
        return;
      }
    }

    setState(() {
      _cargando = true;
      for (final m in _mensajes) {
        if (m['id'] == msgId) m['confirmacionResuelta'] = true;
      }
    });
    _guardarCache();

    final resp = await ApiService.confirmarCopiloto({
      'tipoAccion': conf['tipoAccion'],
      'targetId': conf['targetId'],
      if (targetIds != null) 'targetIds': targetIds,
      'valorTexto': conf['valorTexto'],
      'habilitada': conf['habilitada'],
      'fechaHabilitacion': conf['fechaHabilitacion'],
      'fechaEntrega': conf['fechaEntrega'],
      'fechaCorte': conf['fechaCorte'],
    });

    if (!mounted) return;
    setState(() {
      _mensajes.add({
        'id': 'conf-${DateTime.now().millisecondsSinceEpoch}',
        'role': 'assistant',
        'content': (resp['mensaje'] ?? 'Acción aplicada.').toString(),
      });
      _cargando = false;
    });
    _guardarCache();
    _scrollAlFinal();
  }

  void _cancelarAccion(String msgId) {
    setState(() {
      for (final m in _mensajes) {
        if (m['id'] == msgId) m['confirmacionResuelta'] = true;
      }
      _mensajes.add({
        'id': 'canc-${DateTime.now().millisecondsSinceEpoch}',
        'role': 'assistant',
        'content': 'Acción cancelada. No se realizó ningún cambio.',
      });
    });
    _guardarCache();
    _scrollAlFinal();
  }

  Future<void> _descargarYCompartirReporte(Map<String, dynamic> rep) async {
    final b64 = (rep['pdfBase64'] ?? '').toString();
    if (b64.isEmpty) {
      final ruta = (rep['rutaReportes'] ?? '/dashboard/reportes').toString();
      Navigator.of(context).pop();
      await widget.onNavigateRoute(ruta);
      return;
    }
    try {
      final bytes = base64Decode(b64);
      final dir = await getTemporaryDirectory();
      final nombre = (rep['nombreArchivo'] ?? 'reporte_ficct.pdf').toString();
      final file = File('${dir.path}/$nombre');
      await file.writeAsBytes(bytes);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          text: (rep['titulo'] ?? 'Reporte FICCT').toString(),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo abrir el archivo: $e')),
      );
    }
  }

  Future<void> _seleccionarFechaHora(
      String msgId, String campo, String valorActual) async {
    DateTime inicial = DateTime.tryParse(valorActual) ?? DateTime.now();
    final fecha = await showDatePicker(
      context: context,
      initialDate: inicial,
      firstDate: DateTime(2024),
      lastDate: DateTime(2030),
    );
    if (fecha == null || !mounted) return;

    final hora = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(inicial),
    );
    if (!mounted) return;

    final h = hora ?? TimeOfDay.fromDateTime(inicial);
    final dt = DateTime(fecha.year, fecha.month, fecha.day, h.hour, h.minute);
    final formatted =
        '${dt.year.toString().padLeft(4, '0')}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}T${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

    setState(() {
      for (final m in _mensajes) {
        if (m['id'] == msgId && m['confirmacion'] is Map) {
          (m['confirmacion'] as Map)[campo] = formatted;
        }
      }
    });
    _guardarCache();
  }

  TextSpan _formatearNegritas(String texto, Color textColor) {
    final regex = RegExp(r'(\*\*[^*]+\*\*|\*[^*]+\*)');
    final spans = <TextSpan>[];
    int start = 0;

    for (final match in regex.allMatches(texto)) {
      if (match.start > start) {
        spans.add(TextSpan(text: texto.substring(start, match.start)));
      }
      final raw = match.group(0)!;
      final clean = raw.startsWith('**')
          ? raw.substring(2, raw.length - 2)
          : raw.substring(1, raw.length - 1);
      spans.add(TextSpan(
        text: clean,
        style: const TextStyle(fontWeight: FontWeight.w700),
      ));
      start = match.end;
    }
    if (start < texto.length) {
      spans.add(TextSpan(text: texto.substring(start)));
    }
    return TextSpan(
      style: TextStyle(color: textColor, fontSize: 13.5, height: 1.4),
      children: spans,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC);
    final surfaceColor = isDark ? const Color(0xFF151E32) : Colors.white;
    final borderColor =
        isDark ? Colors.white.withValues(alpha: 0.12) : Colors.black12;
    final textColor = isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A);
    final faintColor = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // Cabecera compacta a pantalla completa
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: surfaceColor,
                border: Border(bottom: BorderSide(color: borderColor)),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.arrow_back_ios_new_rounded,
                        size: 18, color: textColor),
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: 'Minimizar a burbuja',
                  ),
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.accent, Color(0xFF2563EB)],
                      ),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: const Icon(Icons.smart_toy_rounded,
                        color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Copiloto FICCT',
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                            color: textColor,
                          ),
                        ),
                        Text(
                          '${widget.userRole} · Borrador en sesión',
                          style: TextStyle(fontSize: 11, color: faintColor),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.refresh_rounded, color: faintColor, size: 20),
                    onPressed: _limpiarChat,
                    tooltip: 'Limpiar conversación',
                  ),
                ],
              ),
            ),

            // Lista de mensajes
            Expanded(
              child: ListView.builder(
                controller: _scrollCtrl,
                padding: const EdgeInsets.all(14),
                itemCount: _mensajes.length + (_cargando ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == _mensajes.length) {
                    return Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(top: 6),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 9),
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: borderColor),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            const SizedBox(width: 8),
                            Text('Consultando...',
                                style:
                                    TextStyle(fontSize: 12, color: faintColor)),
                          ],
                        ),
                      ),
                    );
                  }

                  final msg = _mensajes[index];
                  final isUser = msg['role'] == 'user';
                  final opciones =
                      msg['opciones'] as List<Map<String, dynamic>>?;
                  final conf = msg['confirmacion'] as Map<String, dynamic>?;
                  final confResuelta = msg['confirmacionResuelta'] == true;
                  final rep = msg['reporte'] as Map<String, dynamic>?;

                  return Column(
                    crossAxisAlignment: isUser
                        ? CrossAxisAlignment.end
                        : CrossAxisAlignment.start,
                    children: [
                      Container(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.86,
                        ),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 13, vertical: 10),
                        decoration: BoxDecoration(
                          color: isUser ? AppTheme.accent : surfaceColor,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: Radius.circular(isUser ? 16 : 4),
                            bottomRight: Radius.circular(isUser ? 4 : 16),
                          ),
                          border: isUser
                              ? null
                              : Border.all(color: borderColor),
                        ),
                        child: Text.rich(
                          _formatearNegritas(
                            (msg['content'] ?? '').toString(),
                            isUser ? Colors.white : textColor,
                          ),
                        ),
                      ),

                      // Tarjetas clicables de aulas / navegacion
                      if (opciones != null && opciones.isNotEmpty)
                        ...opciones.map((op) {
                          final badge = (op['badge'] ?? '').toString();
                          final alDia = badge.startsWith('0 ');
                          return InkWell(
                            onTap: () async {
                              Navigator.of(context).pop();
                              await widget.onNavigateRoute(
                                  (op['ruta'] ?? '/dashboard').toString());
                            },
                            borderRadius: BorderRadius.circular(13),
                            child: Container(
                              width: double.infinity,
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: surfaceColor,
                                borderRadius: BorderRadius.circular(13),
                                border: Border.all(color: borderColor),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.explore_outlined,
                                      size: 16, color: AppTheme.accent),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          (op['titulo'] ?? '').toString(),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w700,
                                            color: textColor,
                                          ),
                                        ),
                                        if ((op['subtitulo'] ?? '')
                                            .toString()
                                            .isNotEmpty)
                                          Text(
                                            (op['subtitulo'] ?? '').toString(),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                                fontSize: 11, color: faintColor),
                                          ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: (alDia
                                              ? Colors.green
                                              : Colors.amber)
                                          .withValues(alpha: 0.16),
                                      borderRadius: BorderRadius.circular(99),
                                    ),
                                    child: Text(
                                      alDia ? 'Al día' : badge,
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w700,
                                        color: alDia
                                            ? Colors.green.shade400
                                            : Colors.amber.shade400,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),

                      // Tarjeta de Confirmacion Human-in-the-Loop
                      if (conf != null && !confResuelta)
                        _buildConfirmCard(
                          msg['id'].toString(),
                          conf,
                          surfaceColor,
                          borderColor,
                          textColor,
                          faintColor,
                        ),

                      // Tarjeta de Reporte PDF / CSV
                      if (rep != null)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(15),
                            border: Border.all(
                                color: const Color(0xFF10B981).withValues(alpha: 0.35)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.picture_as_pdf_rounded,
                                      color: Color(0xFF10B981), size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          (rep['titulo'] ?? 'Reporte')
                                              .toString(),
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w700,
                                            color: textColor,
                                          ),
                                        ),
                                        Text(
                                          (rep['resumen'] ?? '').toString(),
                                          style: TextStyle(
                                              fontSize: 11, color: faintColor),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF10B981),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 8),
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                      ),
                                      onPressed: () =>
                                          _descargarYCompartirReporte(rep),
                                      icon: const Icon(Icons.download_rounded,
                                          size: 16),
                                      label: Text(
                                        (rep['pdfBase64'] ?? '')
                                                .toString()
                                                .isNotEmpty
                                            ? 'Descargar'
                                            : 'Abrir Reportes',
                                        style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  OutlinedButton(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 8),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                    ),
                                    onPressed: () async {
                                      Navigator.of(context).pop();
                                      await widget.onNavigateRoute(
                                          (rep['rutaReportes'] ??
                                                  '/dashboard/reportes')
                                              .toString());
                                    },
                                    child: const Text('Ver tabla',
                                        style: TextStyle(fontSize: 12)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                    ],
                  );
                },
              ),
            ),

            // Sugerencias rapidas horizontales para aprovechar alto en movil
            if (_mensajes.length <= 2 && !_cargando)
              SizedBox(
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: _sugerencias.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, idx) => ActionChip(
                    label: Text(_sugerencias[idx],
                        style: const TextStyle(fontSize: 11.5)),
                    onPressed: () => _enviarMensaje(_sugerencias[idx]),
                  ),
                ),
              ),

            // Barra inferior de entrada
            Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              decoration: BoxDecoration(
                color: surfaceColor,
                border: Border(top: BorderSide(color: borderColor)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputCtrl,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _enviarMensaje(),
                      style: TextStyle(fontSize: 13.5, color: textColor),
                      decoration: InputDecoration(
                        hintText: 'Escribe tu consulta o acción...',
                        hintStyle: TextStyle(fontSize: 12.5, color: faintColor),
                        filled: true,
                        fillColor: bgColor,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: borderColor),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: borderColor),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    color: AppTheme.accent,
                    borderRadius: BorderRadius.circular(14),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: _cargando ? null : () => _enviarMensaje(),
                      child: const Padding(
                        padding: EdgeInsets.all(11),
                        child: Icon(Icons.send_rounded,
                            color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConfirmCard(
    String msgId,
    Map<String, dynamic> conf,
    Color surfaceColor,
    Color borderColor,
    Color textColor,
    Color faintColor,
  ) {
    final tipo = (conf['tipoAccion'] ?? '').toString();
    final esFormularioTarea =
        tipo == 'GESTIONAR_TAREA' || tipo == 'GESTIONAR_PLANTILLA_TAREA';
    final items = conf['items'] as List?;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.withValues(alpha: 0.09),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_user_outlined,
                  color: Colors.amber, size: 17),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  (conf['titulo'] ?? 'Confirmar acción').toString(),
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: textColor,
                  ),
                ),
              ),
            ],
          ),
          if ((conf['detalle'] ?? '').toString().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              (conf['detalle'] ?? '').toString(),
              style: TextStyle(fontSize: 11.5, color: faintColor),
            ),
          ],

          if (esFormularioTarea) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Estado de la tarea',
                    style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: textColor)),
                Switch.adaptive(
                  value: conf['habilitada'] == true,
                  onChanged: (v) {
                    setState(() => conf['habilitada'] = v);
                    _guardarCache();
                  },
                ),
              ],
            ),
            _dateRow(msgId, 'Apertura', 'fechaHabilitacion',
                (conf['fechaHabilitacion'] ?? '').toString(), surfaceColor, borderColor, textColor, faintColor),
            _dateRow(msgId, 'Entrega límite', 'fechaEntrega',
                (conf['fechaEntrega'] ?? '').toString(), surfaceColor, borderColor, textColor, faintColor),
            _dateRow(msgId, 'Cierre / Corte', 'fechaCorte',
                (conf['fechaCorte'] ?? '').toString(), surfaceColor, borderColor, textColor, faintColor),
          ],

          if (items != null && items.isNotEmpty) ...[
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 165),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: items.length,
                itemBuilder: (_, idx) {
                  final it = Map<String, dynamic>.from(items[idx] as Map);
                  return CheckboxListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    value: it['seleccionado'] == true,
                    onChanged: (val) {
                      setState(() {
                        (items[idx] as Map)['seleccionado'] = val ?? false;
                      });
                      _guardarCache();
                    },
                    title: Text(
                      (it['titulo'] ?? '').toString(),
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: textColor),
                    ),
                    subtitle: Text(
                      (it['subtitulo'] ?? '').toString(),
                      style: TextStyle(fontSize: 10.5, color: faintColor),
                    ),
                  );
                },
              ),
            ),
          ],

          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed:
                      _cargando ? null : () => _confirmarAccion(msgId, conf),
                  child: const Text('Aceptar y Guardar',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _cargando ? null : () => _cancelarAccion(msgId),
                child: const Text('Cancelar', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _dateRow(
    String msgId,
    String label,
    String campo,
    String valor,
    Color surfaceColor,
    Color borderColor,
    Color textColor,
    Color faintColor,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: InkWell(
        onTap: () => _seleccionarFechaHora(msgId, campo, valor),
        borderRadius: BorderRadius.circular(9),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(9),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: TextStyle(fontSize: 11.5, color: faintColor)),
              Text(
                valor.isEmpty ? 'Sin definir (tocar)' : valor.replaceAll('T', ' '),
                style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: textColor),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
