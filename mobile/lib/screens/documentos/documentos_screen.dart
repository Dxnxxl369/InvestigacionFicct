import 'package:flutter/material.dart';
import '../../config/app_theme.dart';

class DocumentosScreen extends StatelessWidget {
  const DocumentosScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final docs = [
      {
        'titulo': 'Tesis_Grado_Deteccion_Anomalias.docx',
        'subtitulo': 'Editado hace 2 horas por Carlos Méndez',
        'tipo': 'DOCX',
      },
      {
        'titulo': 'Paper_Conferencia_IA_Medica.pdf',
        'subtitulo': 'Colaborativo con 3 investigadores',
        'tipo': 'PDF',
      },
      {
        'titulo': 'Metodologia_Investigacion_v2.docx',
        'subtitulo': 'Revisado por Lic. Rolando Martínez',
        'tipo': 'DOCX',
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Documentos & Asistente IA'),
        actions: [
          IconButton(
            icon: const Icon(Icons.note_add_rounded),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Nuevo documento colaborativo creado')),
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
                    'Formula tus hipótesis, revisa la redacción científica con normas IEEE y genera resúmenes para tu tesis de grado.',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            Text(
              'MIS DOCUMENTOS DE INVESTIGACIÓN',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.6,
                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
              ),
            ),
            const SizedBox(height: 10),

            ...docs.map((d) {
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      d['tipo'] == 'PDF' ? Icons.picture_as_pdf_rounded : Icons.description_rounded,
                      color: d['tipo'] == 'PDF' ? AppTheme.danger : AppTheme.accent,
                    ),
                  ),
                  title: Text(
                    d['titulo']!,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                    ),
                  ),
                  subtitle: Text(
                    d['subtitulo']!,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                    ),
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded, size: 20),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Abriendo editor para ${d["titulo"]}')),
                    );
                  },
                ),
              );
            }),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}
