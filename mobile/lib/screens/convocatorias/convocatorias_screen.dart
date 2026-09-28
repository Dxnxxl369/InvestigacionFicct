import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';
import '../../services/api_service.dart';

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

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final data = await ApiService.getMisAreas();
    if (mounted) {
      setState(() {
        _convocatorias = data;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Convocatorias & Ferias'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: widget.onNuevaConvocatoria,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              child: Column(
                children: [
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Buscar feria, hackathon o evento...',
                      prefixIcon: const Icon(Icons.search_rounded),
                      filled: true,
                      fillColor: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
                    ),
                  ),
                  const SizedBox(height: 16),

                  ..._convocatorias.map((conv) {
                    return Card(
                      margin: const EdgeInsets.only(bottom: 14),
                      child: InkWell(
                        onTap: () => widget.onOpenDetalle(conv),
                        borderRadius: BorderRadius.circular(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              height: 120,
                              decoration: BoxDecoration(
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                                gradient: LinearGradient(
                                  colors: conv.tipo == 'FERIA'
                                      ? [AppTheme.accent, AppTheme.seal]
                                      : [const Color(0xFF4F46E5), const Color(0xFF06B6D4)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                              ),
                              padding: const EdgeInsets.all(12),
                              alignment: Alignment.bottomLeft,
                              child: Text(
                                conv.titulo,
                                style: const TextStyle(
                                  fontFamily: 'Playfair Display',
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  shadows: [Shadow(color: Colors.black45, blurRadius: 4)],
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
                                        'Cierre: 15 Octubre',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                                        ),
                                      ),
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
                  const SizedBox(height: 70),
                ],
              ),
            ),
    );
  }
}
