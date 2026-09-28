import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/convocatoria_model.dart';

class RoleBadge extends StatelessWidget {
  final String role;

  const RoleBadge({super.key, required this.role});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color text;
    String label;

    switch (role.toUpperCase()) {
      case 'DOCENTE':
        bg = AppTheme.accentSoft;
        text = AppTheme.accentDark;
        label = 'Docente Titular';
        break;
      case 'JURADO':
        bg = AppTheme.sealSoft;
        text = AppTheme.seal;
        label = 'Jurado Calificador';
        break;
      case 'ADMIN':
        bg = AppTheme.dangerSoft;
        text = AppTheme.danger;
        label = 'Administrador';
        break;
      default:
        bg = const Color(0xFFE0F2FE);
        text = const Color(0xFF0369A1);
        label = 'Estudiante';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: text,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class CourseCardMoodle extends StatelessWidget {
  final ConvocatoriaModel curso;
  final VoidCallback onTap;

  const CourseCardMoodle({
    super.key,
    required this.curso,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(
                    colors: [AppTheme.accent, AppTheme.seal],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(
                  Icons.school_rounded,
                  color: Colors.white,
                  size: 30,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.accentSoft,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            curso.tipo,
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.accentDark,
                            ),
                          ),
                        ),
                        Text(
                          'Activo',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      curso.titulo,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      curso.descripcion,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '4 Módulos • 6 Tareas',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.accent,
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward_ios_rounded,
                          size: 12,
                          color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MoodleSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const MoodleSwitch({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: () => onChanged(!value),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: value
              ? (isDark ? const Color(0x33F59E0B) : const Color(0x1DF59E0B))
              : (isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: value ? const Color(0x66F59E0B) : (isDark ? AppTheme.darkLine : AppTheme.lineSoft),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: value ? const Color(0x33F59E0B) : (isDark ? AppTheme.darkPaperRaised : AppTheme.paperRaised),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                value ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                size: 20,
                color: value ? const Color(0xFFD97706) : (isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value ? 'Cursos Ocultos para Otros' : 'Cursos Visibles Públicamente',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value
                        ? 'Solo tú y administración pueden ver tu lista de cursos'
                        : 'Visible para todos los integrantes de la facultad',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                    ),
                  ),
                ],
              ),
            ),
            Switch(
              value: value,
              onChanged: onChanged,
              activeColor: const Color(0xFFD97706),
            ),
          ],
        ),
      ),
    );
  }
}
