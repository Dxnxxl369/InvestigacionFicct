import 'package:flutter/material.dart';
import '../../models/convocatoria_model.dart';
import 'crear_convocatoria_screen.dart';

class EditarConvocatoriaScreen extends StatelessWidget {
  final ConvocatoriaModel convocatoria;
  final VoidCallback onBack;
  final VoidCallback? onSaved;

  const EditarConvocatoriaScreen({
    super.key,
    required this.convocatoria,
    required this.onBack,
    this.onSaved,
  });

  @override
  Widget build(BuildContext context) {
    return CrearConvocatoriaScreen(
      convocatoriaParaEditar: convocatoria,
      onBack: onBack,
      onSaved: onSaved,
    );
  }
}
