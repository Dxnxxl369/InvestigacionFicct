import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../../config/app_theme.dart';
import '../../services/api_service.dart';

class ReportesIAScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const ReportesIAScreen({super.key, this.onBack});

  @override
  State<ReportesIAScreen> createState() => _ReportesIAScreenState();
}

class _ReportesIAScreenState extends State<ReportesIAScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _promptController = TextEditingController();
  final TextEditingController _filtroTablaController = TextEditingController();

  String _tablaFiltro = '';
  bool _cargando = false;
  String? _error;

  Map<String, dynamic>? _reporte;
  List<String> _columnasOrdenadas = [];
  String? _columnaOrden;
  bool _ordenAsc = true;
  String _filtroLocal = '';

  late TabController _tabController;

  final List<Map<String, String>> _sugerencias = [
    {'label': 'Usuarios por Rol', 'prompt': 'Total de usuarios agrupados por rol'},
    {'label': 'Convocatorias y Estados', 'prompt': 'Listar todas las convocatorias con su tipo, modalidad y estado'},
    {'label': 'Docentes Activos', 'prompt': 'Listar docentes activos con su correo y celular'},
    {'label': 'Participantes', 'prompt': 'Total de estudiantes inscritos por convocatoria'},
    {'label': 'Entregas de Tareas', 'prompt': 'Promedio de notas y total de entregas por tarea'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _promptController.dispose();
    _filtroTablaController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _ejecutarConsulta([String? customPrompt]) async {
    final texto = (customPrompt ?? _promptController.text).trim();
    if (texto.isEmpty || _cargando) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _cargando = true;
      _error = null;
    });

    final res = await ApiService.consultarReporteIA(
      prompt: texto,
      tablaFiltro: _tablaFiltro.isNotEmpty ? _tablaFiltro : null,
    );

    if (!mounted) return;

    if (res['exito'] == true) {
      final cols = (res['columnas'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
      setState(() {
        _reporte = res;
        _columnasOrdenadas = cols;
        _columnaOrden = null;
        _filtroLocal = '';
        _filtroTablaController.clear();
        _cargando = false;
      });
    } else {
      setState(() {
        _error = res['error']?.toString() ?? 'No se pudo generar el reporte.';
        _cargando = false;
      });
    }
  }

  void _moverColumna(String col, int direccion) {
    final idx = _columnasOrdenadas.indexOf(col);
    if (idx < 0) return;
    final nuevoIdx = idx + direccion;
    if (nuevoIdx < 0 || nuevoIdx >= _columnasOrdenadas.length) return;

    setState(() {
      _columnasOrdenadas.removeAt(idx);
      _columnasOrdenadas.insert(nuevoIdx, col);
    });
  }

  void _exportarCSV() {
    if (_reporte == null) return;
    final filas = (_reporte!['filas'] as List<dynamic>?) ?? [];
    if (filas.isEmpty) return;

    final cols = _columnasOrdenadas.isNotEmpty
        ? _columnasOrdenadas
        : ((_reporte!['columnas'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? []);

    final buffer = StringBuffer();
    // BOM UTF-8 para Excel
    buffer.write('\uFEFF');
    buffer.writeln(cols.join(';'));

    for (final f in filas) {
      if (f is Map) {
        final line = cols.map((c) {
          final val = f[c];
          if (val == null) return '""';
          final s = val.toString().replaceAll('"', '""').replaceAll('\n', ' ');
          return '"$s"';
        }).join(';');
        buffer.writeln(line);
      }
    }

    SharePlus.instance.share(
      ShareParams(
        text: buffer.toString(),
        subject: 'Reporte Generativo FICCT - ${_reporte!['titulo'] ?? "Datos"}',
      ),
    );
  }

  void _copiarJSON() {
    if (_reporte == null) return;
    final filas = _reporte!['filas'] ?? [];
    Clipboard.setData(ClipboardData(text: const JsonEncoder.withIndent('  ').convert(filas)));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Datos copiados al portapapeles en formato JSON'),
        backgroundColor: AppTheme.accent,
        duration: Duration(seconds: 2),
      ),
    );
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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('Reportes con IA', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.indigo.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.indigo.withValues(alpha: 0.3)),
                  ),
                  child: const Text(
                    'Groq LPU',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.indigo),
                  ),
                ),
              ],
            ),
            Text(
              'Consultas generativas en lenguaje natural',
              style: TextStyle(fontSize: 10, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
            ),
          ],
        ),
        actions: [
          if (_reporte != null) ...[
            IconButton(
              icon: const Icon(Icons.share_rounded, size: 20),
              tooltip: 'Compartir reporte (CSV/Excel)',
              onPressed: _exportarCSV,
            ),
            IconButton(
              icon: const Icon(Icons.data_object_rounded, size: 20),
              tooltip: 'Copiar JSON',
              onPressed: _copiarJSON,
            ),
          ],
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Panel de Entrada de Consulta
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: isDark ? AppTheme.darkLine : AppTheme.line),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Selector de Tabla Objetivo (Opcional)
                    DropdownButtonFormField<String>(
                      value: _tablaFiltro,
                      isDense: true,
                      decoration: InputDecoration(
                        labelText: 'Tabla objetivo (opcional)',
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                      items: const [
                        DropdownMenuItem(value: '', child: Text('Todas las tablas del sistema')),
                        DropdownMenuItem(value: 'usuarios', child: Text('Usuarios y Roles')),
                        DropdownMenuItem(value: 'convocatorias', child: Text('Convocatorias y Ferias')),
                        DropdownMenuItem(value: 'convocatoria_participantes', child: Text('Inscritos y Equipos')),
                        DropdownMenuItem(value: 'tareas', child: Text('Tareas y Calificaciones')),
                        DropdownMenuItem(value: 'biblioteca_documentos', child: Text('Biblioteca Virtual')),
                      ],
                      onChanged: (val) => setState(() => _tablaFiltro = val ?? ''),
                    ),
                    const SizedBox(height: 10),

                    // Campo de Texto de Consulta
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _promptController,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _ejecutarConsulta(),
                            decoration: InputDecoration(
                              hintText: 'Ej. "Docentes activos con celular y correo"...',
                              hintStyle: const TextStyle(fontSize: 12),
                              prefixIcon: const Icon(Icons.auto_awesome, color: AppTheme.accent, size: 20),
                              suffixIcon: _promptController.text.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.clear, size: 16),
                                      onPressed: () {
                                        _promptController.clear();
                                        setState(() {});
                                      },
                                    )
                                  : null,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _cargando ? null : () => _ejecutarConsulta(),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.accent,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _cargando
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.send_rounded, size: 18),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Píldoras de Sugerencias Rápidas
                    const Text(
                      'Sugerencias rápidas:',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.inkFaint),
                    ),
                    const SizedBox(height: 6),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _sugerencias.map((sug) {
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ActionChip(
                              label: Text(sug['label']!, style: const TextStyle(fontSize: 11)),
                              avatar: const Icon(Icons.flash_on_rounded, size: 14, color: AppTheme.accent),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                              onPressed: () {
                                _promptController.text = sug['prompt']!;
                                _ejecutarConsulta(sug['prompt']);
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Mensaje de Error
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.dangerSoft,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: AppTheme.danger, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(fontSize: 12, color: AppTheme.danger, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Indicador de Carga
            if (_cargando) ...[
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: isDark ? AppTheme.darkLine : AppTheme.line),
                ),
                child: const Padding(
                  padding: EdgeInsets.all(28),
                  child: Center(
                    child: Column(
                      children: [
                        CircularProgressIndicator(color: AppTheme.accent),
                        SizedBox(height: 14),
                        Text(
                          'El Agente SQL está deduciendo la consulta...',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Generando sintaxis ANSI, métricas ejecutivas y gráficos',
                          style: TextStyle(fontSize: 11, color: AppTheme.inkSoft),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],

            // Visualización del Reporte
            if (_reporte != null && !_cargando) ...[
              // Título y Explicación de la IA
              Text(
                _reporte!['titulo'] ?? 'Reporte Generado',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              if (_reporte!['explicacion'] != null) ...[
                const SizedBox(height: 4),
                Text(
                  _reporte!['explicacion'].toString(),
                  style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                ),
              ],
              const SizedBox(height: 14),

              // Tarjetas de Métricas Ejecutivas (KPIs)
              if (_reporte!['kpis'] is List && (_reporte!['kpis'] as List).isNotEmpty) ...[
                _buildKpisGrid(_reporte!['kpis'] as List, isDark),
                const SizedBox(height: 16),
              ],

              // Selector de Vistas: Tabla y Gráfico
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Barra de Pestañas
                    TabBar(
                      controller: _tabController,
                      indicatorColor: AppTheme.accent,
                      labelColor: AppTheme.accent,
                      unselectedLabelColor: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                      labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      tabs: [
                        Tab(
                          icon: const Icon(Icons.table_chart_rounded, size: 18),
                          text: 'Tabla (${_getFilasFiltradas().length})',
                        ),
                        const Tab(
                          icon: Icon(Icons.bar_chart_rounded, size: 18),
                          text: 'Gráfico',
                        ),
                      ],
                    ),

                    // Barra de Tiempo y Estado
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.timer_outlined, size: 14, color: AppTheme.inkFaint),
                              const SizedBox(width: 4),
                              Text(
                                'Tiempo: ${_reporte!['tiempoEjecucionMs'] ?? 0} ms',
                                style: const TextStyle(fontSize: 11, color: AppTheme.inkFaint),
                              ),
                            ],
                          ),
                          const Row(
                            children: [
                              Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF10B981)),
                              SizedBox(width: 4),
                              Text(
                                'Consulta ANSI',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),

                    // Contenido según Tab
                    SizedBox(
                      height: 480,
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          // TAB 1: TABLA REACTIVA
                          _buildTablaView(isDark),

                          // TAB 2: GRÁFICO INTELIGENTE
                          _buildGraficoView(isDark),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildKpisGrid(List kpis, bool isDark) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossCount = constraints.maxWidth > 500 ? 4 : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: kpis.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossCount,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.6,
          ),
          itemBuilder: (context, idx) {
            final kpi = kpis[idx] as Map;
            final etiqueta = kpi['etiqueta']?.toString() ?? '';
            final valor = kpi['valor']?.toString() ?? '0';
            final subtitulo = kpi['subtitulo']?.toString() ?? '';
            final icono = kpi['icono']?.toString() ?? '';

            IconData iconData = Icons.layers_rounded;
            Color iconColor = Colors.blue;

            if (icono == 'money') {
              iconData = Icons.attach_money_rounded;
              iconColor = const Color(0xFF10B981);
            } else if (icono == 'score') {
              iconData = Icons.trending_up_rounded;
              iconColor = AppTheme.accent;
            }

            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          etiqueta.toUpperCase(),
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.inkFaint),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Icon(iconData, size: 16, color: iconColor),
                    ],
                  ),
                  Text(
                    valor,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    subtitulo,
                    style: const TextStyle(fontSize: 9.5, color: AppTheme.inkSoft),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  List<Map<String, dynamic>> _getFilasFiltradas() {
    if (_reporte == null) return [];
    final rawFilas = (_reporte!['filas'] as List<dynamic>?) ?? [];
    List<Map<String, dynamic>> lista = [];

    for (final f in rawFilas) {
      if (f is Map) {
        lista.add(Map<String, dynamic>.from(f));
      }
    }

    if (_filtroLocal.trim().isNotEmpty) {
      final q = _filtroLocal.toLowerCase();
      lista = lista.where((f) {
        return f.values.any((v) => v.toString().toLowerCase().contains(q));
      }).toList();
    }

    if (_columnaOrden != null) {
      lista.sort((a, b) {
        final valA = a[_columnaOrden];
        final valB = b[_columnaOrden];
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        if (valA is num && valB is num) {
          return _ordenAsc ? valA.compareTo(valB) : valB.compareTo(valA);
        }
        return _ordenAsc
            ? valA.toString().compareTo(valB.toString())
            : valB.toString().compareTo(valA.toString());
      });
    }

    return lista;
  }

  Widget _buildTablaView(bool isDark) {
    final filas = _getFilasFiltradas();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          // Buscador rápido sobre resultados
          TextField(
            controller: _filtroTablaController,
            decoration: InputDecoration(
              hintText: 'Filtrar datos en vivo...',
              hintStyle: const TextStyle(fontSize: 12),
              prefixIcon: const Icon(Icons.search_rounded, size: 18),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onChanged: (val) => setState(() => _filtroLocal = val),
          ),
          const SizedBox(height: 10),

          // Contenedor con Scroll Bidireccional
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                borderRadius: BorderRadius.circular(12),
              ),
              child: filas.isEmpty
                  ? const Center(
                      child: Text(
                        'No hay registros que coincidan con la búsqueda.',
                        style: TextStyle(fontSize: 12, color: AppTheme.inkSoft),
                      ),
                    )
                  : Scrollbar(
                      thumbVisibility: true,
                      child: SingleChildScrollView(
                        scrollDirection: Axis.vertical,
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            headingRowHeight: 46,
                            dataRowMinHeight: 38,
                            dataRowMaxHeight: 48,
                            columnSpacing: 18,
                            headingRowColor: WidgetStateProperty.all(
                              isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            ),
                            columns: _columnasOrdenadas.map((col) {
                              final idx = _columnasOrdenadas.indexOf(col);
                              final esOrdenada = _columnaOrden == col;

                              return DataColumn(
                                label: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    // Control de reordenamiento hacia la izquierda
                                    if (idx > 0)
                                      InkWell(
                                        onTap: () => _moverColumna(col, -1),
                                        child: const Padding(
                                          padding: EdgeInsets.all(2.0),
                                          child: Icon(Icons.arrow_left_rounded, size: 16, color: AppTheme.inkFaint),
                                        ),
                                      ),
                                    InkWell(
                                      onTap: () {
                                        setState(() {
                                          if (_columnaOrden == col) {
                                            _ordenAsc = !_ordenAsc;
                                          } else {
                                            _columnaOrden = col;
                                            _ordenAsc = true;
                                          }
                                        });
                                      },
                                      child: Row(
                                        children: [
                                          Text(
                                            col,
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 11,
                                              color: esOrdenada ? AppTheme.accent : null,
                                            ),
                                          ),
                                          if (esOrdenada)
                                            Icon(
                                              _ordenAsc ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                                              size: 14,
                                              color: AppTheme.accent,
                                            )
                                          else
                                            const Icon(Icons.unfold_more_rounded, size: 14, color: AppTheme.inkFaint),
                                        ],
                                      ),
                                    ),
                                    // Control de reordenamiento hacia la derecha
                                    if (idx < _columnasOrdenadas.length - 1)
                                      InkWell(
                                        onTap: () => _moverColumna(col, 1),
                                        child: const Padding(
                                          padding: EdgeInsets.all(2.0),
                                          child: Icon(Icons.arrow_right_rounded, size: 16, color: AppTheme.inkFaint),
                                        ),
                                      ),
                                  ],
                                ),
                              );
                            }).toList(),
                            rows: filas.map((fila) {
                              return DataRow(
                                cells: _columnasOrdenadas.map((col) {
                                  final val = fila[col];
                                  String texto = '—';
                                  if (val != null) {
                                    if (val is bool) {
                                      texto = val ? 'Sí' : 'No';
                                    } else {
                                      texto = val.toString();
                                    }
                                  }
                                  return DataCell(
                                    Text(
                                      texto,
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                      ),
                                    ),
                                  );
                                }).toList(),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGraficoView(bool isDark) {
    final grafico = _reporte?['grafico'];
    if (grafico == null || grafico is! Map) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.pie_chart_outline_rounded, size: 40, color: AppTheme.inkFaint),
              SizedBox(height: 10),
              Text(
                'No hay gráfico disponible para este conjunto de datos.',
                style: TextStyle(fontSize: 12, color: AppTheme.inkSoft),
              ),
            ],
          ),
        ),
      );
    }

    final series = (grafico['series'] as List<dynamic>?) ?? [];
    if (series.isEmpty) {
      return const Center(child: Text('Sin datos numéricos para graficar.'));
    }

    final ejeX = grafico['ejeX']?.toString() ?? 'Categoría';
    final ejeY = grafico['ejeY']?.toString() ?? 'Valor';

    num maxVal = 1;
    for (final s in series) {
      if (s is Map) {
        final val = num.tryParse(s['value']?.toString() ?? '0') ?? 0;
        if (val > maxVal) maxVal = val;
      }
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Distribución por $ejeX',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          Text(
            'Métrica evaluada: $ejeY',
            style: const TextStyle(fontSize: 11, color: AppTheme.inkSoft),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.separated(
              itemCount: series.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, idx) {
                final item = series[idx] as Map;
                final label = item['label']?.toString() ?? 'Item $idx';
                final val = num.tryParse(item['value']?.toString() ?? '0') ?? 0;
                final pct = (val / maxVal).clamp(0.0, 1.0);

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            label,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          val.toString(),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.accent),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        height: 12,
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: pct,
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppTheme.accent, Color(0xFF6366F1)],
                              ),
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
