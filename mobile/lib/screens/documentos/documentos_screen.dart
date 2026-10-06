import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/api_service.dart';

class DocumentosScreen extends StatefulWidget {
  const DocumentosScreen({super.key});

  @override
  State<DocumentosScreen> createState() => _DocumentosScreenState();
}

class _DocumentosScreenState extends State<DocumentosScreen> {
  List<Map<String, dynamic>> _documentos = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _categoriaFiltro = 'TODAS';

  @override
  void initState() {
    super.initState();
    _loadDocumentos();
  }

  Future<void> _loadDocumentos() async {
    setState(() => _isLoading = true);
    final list = await ApiService.getDocumentos();
    if (mounted) {
      setState(() {
        _documentos = list;
        _isLoading = false;
      });
    }
  }

  void _showCrearOEditarDocumentoSheet({Map<String, dynamic>? docExistente}) {
    final isEditing = docExistente != null;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final tituloCtrl = TextEditingController(text: docExistente?['titulo'] ?? '');
    final descCtrl = TextEditingController(text: docExistente?['descripcion'] ?? '');
    final contenidoCtrl = TextEditingController(text: docExistente?['contenido'] ?? '');
    String categoria = docExistente?['categoria'] ?? 'INVESTIGACION';
    bool guardando = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          return Container(
            height: MediaQuery.of(ctx).size.height * 0.85,
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkPaper : AppTheme.paper,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
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
                    Icon(
                      isEditing ? Icons.edit_note_rounded : Icons.note_add_rounded,
                      color: AppTheme.accent,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        isEditing ? 'Editar Documento de Investigación' : 'Nuevo Documento Académico',
                        style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: tituloCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Título del Documento *',
                            hintText: 'Ej. Metodología de Detección de Anomalías...',
                            prefixIcon: Icon(Icons.title_rounded),
                          ),
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: categoria,
                          decoration: const InputDecoration(
                            labelText: 'Categoría Académica',
                            prefixIcon: Icon(Icons.category_rounded),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'INVESTIGACION', child: Text('Investigación & Tesis')),
                            DropdownMenuItem(value: 'FERIA', child: Text('Feria de Ciencias')),
                            DropdownMenuItem(value: 'HACKATHON', child: Text('Hackathon / Innovación')),
                            DropdownMenuItem(value: 'TESIS', child: Text('Taller de Grado')),
                          ],
                          onChanged: (val) {
                            if (val != null) setSheetState(() => categoria = val);
                          },
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: descCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Resumen / Abstract (Opcional)',
                            hintText: 'Breve síntesis de los objetivos del documento...',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: contenidoCtrl,
                          maxLines: 8,
                          decoration: const InputDecoration(
                            labelText: 'Cuerpo / Contenido del Trabajo',
                            hintText: 'Escribe las secciones, planteamiento del problema o marco teórico...',
                            alignLabelWithHint: true,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: guardando
                      ? null
                      : () async {
                          final titulo = tituloCtrl.text.trim();
                          if (titulo.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('El título del documento es obligatorio.')),
                            );
                            return;
                          }

                          setSheetState(() => guardando = true);

                          final payload = {
                            'titulo': titulo,
                            'descripcion': descCtrl.text.trim(),
                            'categoria': categoria,
                            'contenido': contenidoCtrl.text.trim(),
                          };

                          Map<String, dynamic>? res;
                          if (isEditing) {
                            final id = (docExistente['id'] as num).toInt();
                            res = await ApiService.actualizarDocumento(id, payload);
                          } else {
                            res = await ApiService.crearDocumento(payload);
                          }

                          if (ctx.mounted && mounted) {
                            setSheetState(() => guardando = false);
                            if (res != null) {
                              Navigator.pop(ctx);
                              _loadDocumentos();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: const Color(0xFF10B981),
                                  content: Text(isEditing ? 'Documento actualizado exitosamente' : 'Documento creado en el repositorio'),
                                ),
                              );
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  backgroundColor: AppTheme.danger,
                                  content: Text('Error al guardar documento en el servidor.'),
                                ),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: AppTheme.accent,
                    foregroundColor: Colors.white,
                  ),
                  child: guardando
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(isEditing ? 'Guardar Cambios' : 'Crear Documento'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _eliminarDoc(int id, String titulo) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar Documento'),
        content: Text('¿Estás seguro de que deseas eliminar permanentemente "$titulo"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final ok = await ApiService.eliminarDocumento(id);
      if (mounted) {
        if (ok) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Documento eliminado exitosamente')),
          );
          _loadDocumentos();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(backgroundColor: AppTheme.danger, content: Text('Error al eliminar documento.')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filtrados = _documentos.where((d) {
      final titulo = (d['titulo'] ?? '').toString().toLowerCase();
      final desc = (d['descripcion'] ?? '').toString().toLowerCase();
      final cat = (d['categoria'] ?? '').toString();
      final q = _searchQuery.toLowerCase().trim();

      final matchesQuery = q.isEmpty || titulo.contains(q) || desc.contains(q);
      final matchesCat = _categoriaFiltro == 'TODAS' || cat == _categoriaFiltro;
      return matchesQuery && matchesCat;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Documentos & Asistente IA'),
        actions: [
          IconButton(
            icon: const Icon(Icons.note_add_rounded),
            tooltip: 'Crear nuevo documento',
            onPressed: () => _showCrearOEditarDocumentoSheet(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDocumentos,
        color: AppTheme.accent,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Banner Asistente IA
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.accent.withValues(alpha: 0.15),
                      AppTheme.seal.withValues(alpha: 0.15),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppTheme.accentSoft),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.auto_awesome_rounded, color: AppTheme.accent, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Asistente de Redacción IA FICCT',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.darkInk : AppTheme.ink,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Formula tus hipótesis, revisa la redacción científica con normas IEEE y genera resúmenes para tu tesis de grado conectado en tiempo real al repositorio.',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Buscador y Filtros de Categoría
              TextField(
                decoration: InputDecoration(
                  hintText: 'Buscar documentos en el repositorio...',
                  prefixIcon: const Icon(Icons.search_rounded),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  filled: true,
                  fillColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                ),
                onChanged: (val) => setState(() => _searchQuery = val),
              ),
              const SizedBox(height: 10),

              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _FilterChip(
                      label: 'Todas',
                      selected: _categoriaFiltro == 'TODAS',
                      onSelected: () => setState(() => _categoriaFiltro = 'TODAS'),
                    ),
                    const SizedBox(width: 6),
                    _FilterChip(
                      label: 'Investigación',
                      selected: _categoriaFiltro == 'INVESTIGACION',
                      onSelected: () => setState(() => _categoriaFiltro = 'INVESTIGACION'),
                    ),
                    const SizedBox(width: 6),
                    _FilterChip(
                      label: 'Feria',
                      selected: _categoriaFiltro == 'FERIA',
                      onSelected: () => setState(() => _categoriaFiltro = 'FERIA'),
                    ),
                    const SizedBox(width: 6),
                    _FilterChip(
                      label: 'Hackathon',
                      selected: _categoriaFiltro == 'HACKATHON',
                      onSelected: () => setState(() => _categoriaFiltro = 'HACKATHON'),
                    ),
                    const SizedBox(width: 6),
                    _FilterChip(
                      label: 'Tesis',
                      selected: _categoriaFiltro == 'TESIS',
                      onSelected: () => setState(() => _categoriaFiltro = 'TESIS'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'DOCUMENTOS EN REPOSITORIO (${filtrados.length})',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.6,
                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                    ),
                  ),
                  if (_isLoading)
                    const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accent)),
                ],
              ),
              const SizedBox(height: 10),

              if (_isLoading && _documentos.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: AppTheme.accent),
                  ),
                )
              else if (filtrados.isEmpty)
                Container(
                  padding: const EdgeInsets.all(30),
                  alignment: Alignment.center,
                  child: Column(
                    children: [
                      Icon(Icons.folder_open_rounded, size: 48, color: isDark ? AppTheme.darkLine : AppTheme.line),
                      const SizedBox(height: 12),
                      const Text(
                        'No hay documentos registrados en esta categoría.',
                        style: TextStyle(fontSize: 13, color: AppTheme.inkSoft),
                      ),
                      const SizedBox(height: 14),
                      OutlinedButton.icon(
                        onPressed: () => _showCrearOEditarDocumentoSheet(),
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Crear Primer Documento'),
                      ),
                    ],
                  ),
                )
              else
                ...filtrados.map((doc) {
                  final id = (doc['id'] as num?)?.toInt() ?? 0;
                  final titulo = doc['titulo'] ?? 'Sin título';
                  final desc = doc['descripcion'] ?? '';
                  final categoria = doc['categoria'] ?? 'DOC';
                  final autor = doc['autorNombre'] ?? 'Investigador';
                  final permiso = doc['miPermiso'] ?? 'LECTURA';
                  final esOwnerOAdmin = permiso == 'OWNER' || permiso == 'ADMINISTRACION';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppTheme.accentSoft,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  categoria,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.accentDark,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              if (esOwnerOAdmin) ...[
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 18),
                                  constraints: const BoxConstraints(),
                                  padding: const EdgeInsets.all(4),
                                  tooltip: 'Editar documento',
                                  onPressed: () => _showCrearOEditarDocumentoSheet(docExistente: doc),
                                ),
                                const SizedBox(width: 4),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.danger),
                                  constraints: const BoxConstraints(),
                                  padding: const EdgeInsets.all(4),
                                  tooltip: 'Eliminar documento',
                                  onPressed: () => _eliminarDoc(id, titulo),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            titulo,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppTheme.darkInk : AppTheme.ink,
                            ),
                          ),
                          if (desc.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              desc,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 11.5, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                            ),
                          ],
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              const Icon(Icons.person_outline_rounded, size: 13, color: AppTheme.inkFaint),
                              const SizedBox(width: 4),
                              Text(
                                autor,
                                style: const TextStyle(fontSize: 11, color: AppTheme.inkFaint),
                              ),
                              const Spacer(),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  permiso,
                                  style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppTheme.inkSoft),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onSelected;

  const _FilterChip({required this.label, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11.5, fontWeight: selected ? FontWeight.bold : FontWeight.normal)),
      selected: selected,
      selectedColor: AppTheme.accentSoft,
      labelStyle: TextStyle(color: selected ? AppTheme.accentDark : AppTheme.inkSoft),
      onSelected: (_) => onSelected(),
    );
  }
}
