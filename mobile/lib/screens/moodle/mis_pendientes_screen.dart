import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/tarea_model.dart';
import '../../services/api_service.dart';
import '../../widgets/moodle_widgets.dart';
import 'tarea_entrega_screen.dart';

class MisPendientesScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const MisPendientesScreen({super.key, this.onBack});

  @override
  State<MisPendientesScreen> createState() => _MisPendientesScreenState();
}

class _MisPendientesScreenState extends State<MisPendientesScreen> {
  List<TareaModel> _tareas = [];
  bool _isLoading = true;
  String? _error;
  String _filtroActivo = 'TODOS'; // TODOS | PENDIENTE | ENTREGADO | CALIFICADO | VENCIDA

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await ApiService.getMisTareas();
      if (!mounted) return;

      final parsed = data.map((d) => TareaModel.fromJson(d)).toList();

      setState(() {
        _tareas = parsed;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = 'Error al cargar tus tareas: $e';
      });
    }
  }

  List<TareaModel> get _tareasFiltradas {
    if (_filtroActivo == 'TODOS') return _tareas;

    return _tareas.where((t) {
      final estado = t.miEstado ?? (t.calificacion != null ? 'CALIFICADO' : (t.archivoUrl != null ? 'ENTREGADO' : 'PENDIENTE'));
      if (_filtroActivo == 'ENTREGADO') {
        return estado == 'ENTREGADO' || estado == 'ENTREGADO_CON_RETRASO';
      }
      return estado == _filtroActivo;
    }).toList();
  }

  int get _totalEntregadas {
    return _tareas.where((t) {
      final e = t.miEstado;
      return e == 'ENTREGADO' || e == 'ENTREGADO_CON_RETRASO' || e == 'CALIFICADO' || t.calificacion != null || t.archivoUrl != null;
    }).length;
  }

  void _abrirTarea(TareaModel tarea) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => TareaEntregaScreen(
          tarea: tarea,
          onBack: () {
            Navigator.of(ctx).pop();
            _cargar();
          },
        ),
      ),
    );
  }

  int? _calcularDiasRestantes(String? fechaEntrega) {
    if (fechaEntrega == null) return null;
    try {
      final f = DateTime.parse(fechaEntrega);
      final ahora = DateTime.now();
      return f.difference(ahora).inDays;
    } catch (_) {
      return null;
    }
  }

  String _formatFecha(String? fechaStr) {
    if (fechaStr == null) return 'Sin fecha límite';
    try {
      final f = DateTime.parse(fechaStr);
      final dia = f.day.toString().padLeft(2, '0');
      final mes = f.month.toString().padLeft(2, '0');
      final anio = f.year;
      final hora = f.hour.toString().padLeft(2, '0');
      final min = f.minute.toString().padLeft(2, '0');
      return '$dia/$mes/$anio $hora:$min';
    } catch (_) {
      return fechaStr.replaceFirst('T', ' ');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final total = _tareas.length;
    final entregadas = _totalEntregadas;
    final progreso = total > 0 ? (entregadas / total).clamp(0.0, 1.0) : 0.0;
    final porcentaje = (progreso * 100).round();

    return Scaffold(
      appBar: AppBar(
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: widget.onBack,
              )
            : null,
        title: const Text('Mis Pendientes', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          const NotificacionBadge(),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualizar',
            onPressed: _cargar,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline_rounded, size: 52, color: AppTheme.danger),
                        const SizedBox(height: 14),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.darkInk : AppTheme.ink,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _cargar,
                          icon: const Icon(Icons.refresh_rounded, size: 18),
                          label: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _cargar,
                  color: AppTheme.accent,
                  child: Column(
                    children: [
                      // Tarjeta de progreso general
                      Container(
                        margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkPaper : AppTheme.paper,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Progreso de Entregas',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  '$entregadas de $total entregadas ($porcentaje%)',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.accentDark,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: LinearProgressIndicator(
                                value: progreso,
                                minHeight: 8,
                                backgroundColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                color: const Color(0xFF10B981),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Barra de filtros
                      Container(
                        height: 48,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            _buildFilterChip('TODOS', 'Todas ($total)'),
                            const SizedBox(width: 6),
                            _buildFilterChip(
                              'PENDIENTE',
                              'Pendientes (${_contarPorEstado('PENDIENTE')})',
                            ),
                            const SizedBox(width: 6),
                            _buildFilterChip(
                              'ENTREGADO',
                              'Entregadas (${_contarPorEstado('ENTREGADO')})',
                            ),
                            const SizedBox(width: 6),
                            _buildFilterChip(
                              'CALIFICADO',
                              'Calificadas (${_contarPorEstado('CALIFICADO')})',
                            ),
                            const SizedBox(width: 6),
                            _buildFilterChip(
                              'VENCIDA',
                              'Vencidas (${_contarPorEstado('VENCIDA')})',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Lista de tareas
                      Expanded(
                        child: _tareasFiltradas.isEmpty
                            ? Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(32),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.assignment_turned_in_outlined, size: 54, color: AppTheme.inkFaint),
                                      const SizedBox(height: 14),
                                      Text(
                                        'No tienes tareas en esta sección',
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                          color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        '¡Buen trabajo! Estás al día con tus actividades académicas.',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.fromLTRB(16, 6, 16, 20),
                                itemCount: _tareasFiltradas.length,
                                itemBuilder: (ctx, idx) {
                                  final t = _tareasFiltradas[idx];
                                  return _buildTareaCard(t, isDark);
                                },
                              ),
                      ),
                    ],
                  ),
                ),
    );
  }

  int _contarPorEstado(String st) {
    if (st == 'ENTREGADO') {
      return _tareas.where((t) {
        final e = t.miEstado;
        return e == 'ENTREGADO' || e == 'ENTREGADO_CON_RETRASO';
      }).length;
    }
    return _tareas.where((t) => t.miEstado == st).length;
  }

  Widget _buildFilterChip(String key, String label) {
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
      onSelected: (_) {
        setState(() => _filtroActivo = key);
      },
    );
  }

  Widget _buildTareaCard(TareaModel tarea, bool isDark) {
    final estado = tarea.miEstado ?? (tarea.calificacion != null ? 'CALIFICADO' : (tarea.archivoUrl != null ? 'ENTREGADO' : 'PENDIENTE'));
    final dias = _calcularDiasRestantes(tarea.fechaLimite);
    final urgente = dias != null && dias <= 2 && dias >= 0 && estado == 'PENDIENTE';
    final conRetraso = tarea.conRetraso || estado == 'ENTREGADO_CON_RETRASO';

    Color badgeBg;
    Color badgeText;
    String badgeLabel;

    switch (estado) {
      case 'PENDIENTE':
        badgeBg = const Color(0xFFDBEAFE);
        badgeText = const Color(0xFF1D4ED8);
        badgeLabel = 'Pendiente';
        break;
      case 'ENTREGADO':
        badgeBg = const Color(0xFFD1FAE5);
        badgeText = const Color(0xFF047857);
        badgeLabel = 'Entregado';
        break;
      case 'ENTREGADO_CON_RETRASO':
        badgeBg = const Color(0xFFFFEDD5);
        badgeText = const Color(0xFFC2410C);
        badgeLabel = 'Con Retraso';
        break;
      case 'CALIFICADO':
        badgeBg = const Color(0xFFEDE9FE);
        badgeText = const Color(0xFF6D28D9);
        badgeLabel = 'Calificado';
        break;
      case 'VENCIDA':
        badgeBg = const Color(0xFFFEE2E2);
        badgeText = const Color(0xFFB91C1C);
        badgeLabel = 'Vencida';
        break;
      default:
        badgeBg = const Color(0xFFF3F4F6);
        badgeText = const Color(0xFF4B5563);
        badgeLabel = estado;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: urgente
              ? const Color(0xFFF97316)
              : (isDark ? AppTheme.darkLine : AppTheme.lineSoft),
          width: urgente ? 1.5 : 1.0,
        ),
      ),
      child: InkWell(
        onTap: () => _abrirTarea(tarea),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Fila superior: Badges de estado y urgencia
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: badgeBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          badgeLabel,
                          style: TextStyle(
                            color: badgeText,
                            fontSize: 10.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (conRetraso && estado != 'ENTREGADO_CON_RETRASO') ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFEDD5),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: const Text(
                            'Con retraso',
                            style: TextStyle(color: Color(0xFFC2410C), fontSize: 9.5, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                      if (urgente) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEE2E2),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: const Text(
                            '¡Vence pronto!',
                            style: TextStyle(color: Color(0xFFDC2626), fontSize: 9.5, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (tarea.calificacion != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEDE9FE),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${tarea.calificacion} / ${tarea.puntajeMaximo?.toInt() ?? 100} pts',
                        style: const TextStyle(
                          color: Color(0xFF6D28D9),
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              // Título y Área
              Text(
                tarea.titulo,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppTheme.darkInk : AppTheme.ink,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.school_outlined, size: 14, color: AppTheme.inkFaint),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      tarea.convocatoriaTitulo ?? 'Área Académica',
                      style: const TextStyle(fontSize: 12, color: AppTheme.inkFaint),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              const Divider(height: 1),
              const SizedBox(height: 10),

              // Fila inferior: Fecha límite / Archivo entregado / Botón
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.schedule_rounded, size: 15, color: AppTheme.inkFaint),
                      const SizedBox(width: 6),
                      Text(
                        _formatFecha(tarea.fechaLimite),
                        style: const TextStyle(fontSize: 11.5, color: AppTheme.inkFaint),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Text(
                        estado == 'CALIFICADO'
                            ? 'Ver nota'
                            : estado == 'PENDIENTE'
                                ? 'Entregar'
                                : 'Ver entrega',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.accent,
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, size: 18, color: AppTheme.accent),
                    ],
                  ),
                ],
              ),

              // Comentario o retroalimentación si ya fue calificada
              if (tarea.retroalimentacion != null && tarea.retroalimentacion!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.comment_outlined, size: 14, color: Color(0xFF6D28D9)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          tarea.retroalimentacion!,
                          style: TextStyle(
                            fontSize: 11,
                            fontStyle: FontStyle.italic,
                            color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
