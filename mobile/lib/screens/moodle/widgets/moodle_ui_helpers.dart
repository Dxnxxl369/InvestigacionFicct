import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../services/api_service.dart';

class MoodleUIHelpers {
  static String formatearFechaCorta(String? fechaStr) {
    if (fechaStr == null || fechaStr.isEmpty) return '';
    final dt = DateTime.tryParse(fechaStr);
    if (dt != null) {
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    return fechaStr;
  }

  static String formatNombre(Map<String, dynamic> p) {
    final nombre = (p['nombre'] ?? '').toString().trim();
    final apellidos = (p['apellidos'] ?? p['apellido'] ?? '').toString().trim();
    if (nombre.isNotEmpty || apellidos.isNotEmpty) {
      return '$nombre $apellidos'.trim();
    }
    if (p['nombreCompleto'] != null && p['nombreCompleto'].toString().trim().isNotEmpty) {
      return p['nombreCompleto'].toString().trim();
    }
    if (p['estudianteNombre'] != null && p['estudianteNombre'].toString().trim().isNotEmpty) {
      return p['estudianteNombre'].toString().trim();
    }
    if (p['usuarioNombre'] != null && p['usuarioNombre'].toString().trim().isNotEmpty) {
      return p['usuarioNombre'].toString().trim();
    }
    return 'Participante';
  }

  static String formatGrupo(Map<String, dynamic> p) {
    if (p['gruposNombres'] is List && (p['gruposNombres'] as List).isNotEmpty) {
      return (p['gruposNombres'] as List).join(', ');
    }
    final equipo = (p['nombreEquipo'] ?? p['grupoNombre']) as String?;
    if (equipo != null && equipo.trim().isNotEmpty) {
      return equipo.trim();
    }
    return '';
  }

  static Widget buildAvatar(String nombre, String? foto, String rol) {
    final fotoUrl = ApiService.resolveFileUrl(foto);
    final bg = rol == 'DOCENTE'
        ? AppTheme.accent
        : (rol == 'JURADO' ? AppTheme.seal : (rol == 'ADMIN' ? const Color(0xFF10B981) : AppTheme.gold));

    return CircleAvatar(
      radius: 17,
      backgroundColor: bg,
      backgroundImage: fotoUrl != null ? NetworkImage(fotoUrl) : null,
      child: fotoUrl == null
          ? Text(
              nombre.isNotEmpty ? nombre[0].toUpperCase() : 'U',
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
            )
          : null,
    );
  }

  static Widget buildMetricCard(String label, String value, Color color, bool isDark) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
        ),
        child: Column(
          children: [
            Text(label,
                style: const TextStyle(fontSize: 9.5, color: AppTheme.inkFaint, fontWeight: FontWeight.w600),
                overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
