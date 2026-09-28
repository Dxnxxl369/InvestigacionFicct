import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/convocatoria_model.dart';

class ConvocatoriaDetalleScreen extends StatelessWidget {
  final ConvocatoriaModel convocatoria;
  final VoidCallback onBack;

  const ConvocatoriaDetalleScreen({
    super.key,
    required this.convocatoria,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: onBack,
        ),
        title: const Text('Detalle de Feria'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Enlace de convocatoria copiado al portapapeles')),
              );
            },
          ),
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
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.accentSoft,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        convocatoria.tipo,
                        style: const TextStyle(
                          color: AppTheme.accentDark,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      convocatoria.titulo,
                      style: TextStyle(
                        fontFamily: 'Playfair Display',
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      convocatoria.descripcion,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 16),

                    const Text(
                      'TRIBUNAL & ENCARGADOS:',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.inkFaint),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const CircleAvatar(
                          radius: 14,
                          backgroundColor: AppTheme.accent,
                          child: Text('RM', style: TextStyle(color: Colors.white, fontSize: 10)),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Lic. Rolando Martínez (Coordinador)',
                          style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInk : AppTheme.ink),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const CircleAvatar(
                          radius: 14,
                          backgroundColor: AppTheme.seal,
                          child: Text('JC', style: TextStyle(color: Colors.white, fontSize: 10)),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Ing. Julio Cabrera (Jurado Evaluador)',
                          style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkInk : AppTheme.ink),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    const Text(
                      'REQUISITOS DE PARTICIPACIÓN:',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.inkFaint),
                    ),
                    const SizedBox(height: 6),
                    _RequisitoItem(text: 'Ser estudiante regular de la Facultad FICCT.'),
                    _RequisitoItem(text: 'Subir propuesta en formato IEEE PDF.'),
                    _RequisitoItem(text: 'Equipos de 1 a 3 integrantes.'),
                    const SizedBox(height: 20),

                    ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            backgroundColor: Color(0xFF10B981),
                            content: Text('¡Solicitud de inscripción registrada con éxito!'),
                          ),
                        );
                      },
                      child: const Text('Solicitar Inscripción al Evento'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RequisitoItem extends StatelessWidget {
  final String text;

  const _RequisitoItem({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline_rounded, color: AppTheme.accent, size: 16),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 12))),
        ],
      ),
    );
  }
}
