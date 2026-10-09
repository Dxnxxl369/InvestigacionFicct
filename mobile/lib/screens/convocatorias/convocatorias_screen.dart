import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';
import '../../models/user_model.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/moodle_widgets.dart';

class ConvocatoriasScreen extends StatefulWidget {
  final Function(ConvocatoriaModel) onOpenDetalle;
  final VoidCallback onNuevaConvocatoria;

  const ConvocatoriasScreen({
    super.key,
    required this.onOpenDetalle,
    required this.onNuevaConvocatoria,
  });

  @override
  State<ConvocatoriasScreen> createState() => _ConvocatoriasScreenState();
}

class _ConvocatoriasScreenState extends State<ConvocatoriasScreen> {
  List<ConvocatoriaModel> _convocatorias = [];
  bool _isLoading = true;
  UserModel? _currentUser;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final user = await StorageService.getUser();
    final data = await ApiService.getConvocatorias();
    final misAreas = await ApiService.getMisAreas();

    final misAreasMap = <int, ConvocatoriaModel>{};
    for (final a in misAreas) {
      misAreasMap[a.id] = a;
    }

    final enriched = data.map((c) {
      if (misAreasMap.containsKey(c.id)) {
        final area = misAreasMap[c.id]!;
        return ConvocatoriaModel(
          id: c.id,
          titulo: c.titulo,
          descripcion: c.descripcion,
          tipo: c.tipo,
          estado: c.estado,
          fechaCierre: c.fechaCierre,
          imagenPortada: c.imagenPortada,
          creadorId: c.creadorId,
          creadorNombre: c.creadorNombre,
          docenteIds: c.docenteIds,
          juradoIds: c.juradoIds,
          docentesEncargados: c.docentesEncargados,
          juradosAsignados: c.juradosAsignados,
          miEstadoInscripcion: area.miEstadoInscripcion ?? c.miEstadoInscripcion,
          miRol: area.miRol ?? c.miRol,
        );
      }
      return c;
    }).toList();

    if (mounted) {
      setState(() {
        _currentUser = user;
        _convocatorias = enriched;
        _isLoading = false;
      });
    }
  }

  Future<void> _handlePublicar(int convId, String titulo) async {
    final ok = await ApiService.publicarConvocatoria(convId);
    if (mounted) {
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('¡Convocatoria "$titulo" publicada exitosamente en el portal!'),
          ),
        );
        _loadData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('No se pudo publicar la convocatoria.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isAdmin = _currentUser != null && _currentUser!.rol == 'ADMIN';

    final filtered = _convocatorias.where((c) {
      // Estudiantes y público general solo deben ver convocatorias PUBLICADAS
      if (!isAdmin && c.estado != 'PUBLICADA') return false;
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return c.titulo.toLowerCase().contains(q) ||
          c.descripcion.toLowerCase().contains(q) ||
          c.tipo.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Convocatorias & Ferias'),
        actions: [
          const NotificacionBadge(),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualizar catálogo',
            onPressed: _loadData,
          ),
          if (isAdmin)
            IconButton(
              icon: const Icon(Icons.add_rounded),
              tooltip: 'Nueva Convocatoria',
              onPressed: widget.onNuevaConvocatoria,
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppTheme.accent,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                // Padding inferior suficiente (130) para que el LiquidNavBar flotante jamás tape el contenido
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 130),
                child: Column(
                  children: [
                    TextField(
                      onChanged: (val) => setState(() => _searchQuery = val),
                      decoration: InputDecoration(
                        hintText: 'Buscar feria, hackathon o evento...',
                        prefixIcon: const Icon(Icons.search_rounded),
                        filled: true,
                        fillColor: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
                      ),
                    ),
                    const SizedBox(height: 16),

                    if (filtered.isEmpty)
                      Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            const Icon(Icons.event_busy_rounded, size: 48, color: AppTheme.inkFaint),
                            const SizedBox(height: 12),
                            const Text(
                              'No se encontraron convocatorias disponibles.',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              isAdmin
                                  ? 'Puedes crear la primera usando el botón verde de abajo o el botón "+" superior.'
                                  : 'Pronto se publicarán nuevas convocatorias institucionales.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 11.5, color: AppTheme.inkSoft),
                            ),
                          ],
                        ),
                      )
                    else
                      ...filtered.map((conv) {
                        final isBorrador = conv.estado == 'BORRADOR';
                        return Card(
                          margin: const EdgeInsets.only(bottom: 14),
                          child: InkWell(
                            onTap: () => widget.onOpenDetalle(conv),
                            borderRadius: BorderRadius.circular(20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  height: 125,
                                  decoration: BoxDecoration(
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                                    image: conv.imagenPortada != null && conv.imagenPortada!.isNotEmpty
                                        ? DecorationImage(
                                            image: NetworkImage(conv.imagenPortada!),
                                            fit: BoxFit.cover,
                                          )
                                        : null,
                                    gradient: (conv.imagenPortada == null || conv.imagenPortada!.isEmpty)
                                        ? LinearGradient(
                                            colors: conv.tipo == 'FERIA'
                                                ? [AppTheme.accent, AppTheme.seal]
                                                : [const Color(0xFF4F46E5), const Color(0xFF06B6D4)],
                                            begin: Alignment.topLeft,
                                            end: Alignment.bottomRight,
                                          )
                                        : null,
                                  ),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                                      gradient: LinearGradient(
                                        colors: [Colors.black.withValues(alpha: 0.65), Colors.transparent],
                                        begin: Alignment.bottomCenter,
                                        end: Alignment.topCenter,
                                      ),
                                    ),
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: Colors.black.withValues(alpha: 0.5),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                conv.tipo,
                                                style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                            const Spacer(),
                                            if (conv.miEstadoInscripcion != null) ...[
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                margin: const EdgeInsets.only(right: 6),
                                                decoration: BoxDecoration(
                                                  color: conv.miEstadoInscripcion == 'ACEPTADO'
                                                      ? const Color(0xFF10B981)
                                                      : conv.miEstadoInscripcion == 'PENDIENTE'
                                                          ? Colors.amber.shade700
                                                          : AppTheme.danger,
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Text(
                                                  conv.miEstadoInscripcion == 'ACEPTADO'
                                                      ? '✓ ADMITIDO'
                                                      : conv.miEstadoInscripcion == 'PENDIENTE'
                                                          ? '⏳ PENDIENTE'
                                                          : '✕ RECHAZADO',
                                                  style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                                                ),
                                              ),
                                            ],
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: isBorrador
                                                    ? Colors.amber.withValues(alpha: 0.85)
                                                    : const Color(0xFF10B981).withValues(alpha: 0.85),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                conv.estado,
                                                style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                          ],
                                        ),
                                        Text(
                                          conv.titulo,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                            shadows: [Shadow(color: Colors.black54, blurRadius: 4)],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        conv.descripcion,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 10),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            conv.fechaCierre != null
                                                ? 'Cierre: ${conv.fechaCierre}'
                                                : 'Inscripción Abierta',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                            ),
                                          ),
                                          if (isAdmin && isBorrador)
                                            ElevatedButton(
                                              onPressed: () => _handlePublicar(conv.id, conv.titulo),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: const Color(0xFF10B981),
                                                foregroundColor: Colors.white,
                                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                minimumSize: Size.zero,
                                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              ),
                                              child: const Text('Publicar', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                            )
                                          else if (conv.miEstadoInscripcion == 'ACEPTADO')
                                            const Text(
                                              '🎓 Ver Aula Virtual →',
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: Color(0xFF10B981),
                                              ),
                                            )
                                          else if (conv.miEstadoInscripcion == 'PENDIENTE')
                                            Text(
                                              '⏳ En Revisión →',
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.amber.shade700,
                                              ),
                                            )
                                          else
                                            const Text(
                                              'Ver Requisitos →',
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.accent,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    const SizedBox(height: 95),
                  ],
                ),
              ),
            ),
      // Botón flotante verde con padding inferior (85.0) para flotar limpiamente SOBRE el LiquidNavbar
      floatingActionButton: isAdmin
          ? Padding(
              padding: const EdgeInsets.only(bottom: 85.0),
              child: FloatingActionButton.extended(
                onPressed: widget.onNuevaConvocatoria,
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                elevation: 4,
                icon: const Icon(Icons.add_rounded, size: 22),
                label: const Text(
                  'Nueva Convocatoria',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            )
          : null,
    );
  }
}
