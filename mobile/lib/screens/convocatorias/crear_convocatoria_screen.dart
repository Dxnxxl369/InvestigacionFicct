import 'package:flutter/material.dart';
import '../../config/app_theme.dart';

class CrearConvocatoriaScreen extends StatefulWidget {
  final VoidCallback onBack;

  const CrearConvocatoriaScreen({super.key, required this.onBack});

  @override
  State<CrearConvocatoriaScreen> createState() => _CrearConvocatoriaScreenState();
}

class _CrearConvocatoriaScreenState extends State<CrearConvocatoriaScreen> {
  final _tituloCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _tipo = 'FERIA';
  bool _hasImage = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: widget.onBack,
        ),
        title: const Text('Nueva Convocatoria'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _tituloCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Título del Evento',
                        hintText: 'Ej. Concurso de Programación 2026',
                      ),
                    ),
                    const SizedBox(height: 14),

                    DropdownButtonFormField<String>(
                      value: _tipo,
                      decoration: const InputDecoration(labelText: 'Tipo de Convocatoria'),
                      items: const [
                        DropdownMenuItem(value: 'FERIA', child: Text('Feria Científica')),
                        DropdownMenuItem(value: 'HACKATHON', child: Text('Hackathon')),
                        DropdownMenuItem(value: 'CONCURSO', child: Text('Concurso')),
                        DropdownMenuItem(value: 'INVESTIGACION', child: Text('Investigación de Grado')),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _tipo = val);
                      },
                    ),
                    const SizedBox(height: 14),

                    // Selector de Imagen de Portada
                    InkWell(
                      onTap: () {
                        setState(() => _hasImage = !_hasImage);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(_hasImage ? 'Foto de portada seleccionada' : 'Foto eliminada')),
                        );
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 20),
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: _hasImage ? AppTheme.accent : (isDark ? AppTheme.darkLine : AppTheme.line),
                            width: _hasImage ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              _hasImage ? Icons.check_circle_rounded : Icons.add_photo_alternate_outlined,
                              color: _hasImage ? AppTheme.accent : AppTheme.inkFaint,
                              size: 32,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _hasImage ? 'Portada cargada (Toca para cambiar)' : 'Seleccionar foto de portada local o URL',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _hasImage ? AppTheme.accent : AppTheme.inkSoft,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    TextField(
                      controller: _descCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Descripción del Evento',
                        hintText: 'Objetivos, bases y cronograma...',
                      ),
                    ),
                    const SizedBox(height: 14),

                    const TextField(
                      decoration: InputDecoration(
                        labelText: 'Asignar Docentes / Jurados',
                        hintText: 'Buscar por nombre o correo...',
                        prefixIcon: Icon(Icons.person_search_rounded),
                      ),
                    ),
                    const SizedBox(height: 20),

                    ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            backgroundColor: Color(0xFF10B981),
                            content: Text('¡Convocatoria creada y publicada en el portal!'),
                          ),
                        );
                        widget.onBack();
                      },
                      child: const Text('Publicar Convocatoria'),
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
