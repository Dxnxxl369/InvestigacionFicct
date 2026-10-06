import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/convocatoria_model.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

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
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: curso.miEstadoInscripcion == 'ACEPTADO'
                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                : curso.miEstadoInscripcion == 'PENDIENTE'
                                    ? Colors.amber.withValues(alpha: 0.15)
                                    : AppTheme.accentSoft,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            curso.miEstadoInscripcion == 'ACEPTADO'
                                ? '✓ Admitido'
                                : curso.miEstadoInscripcion == 'PENDIENTE'
                                    ? '⏳ Pendiente'
                                    : 'Activo',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: curso.miEstadoInscripcion == 'ACEPTADO'
                                  ? const Color(0xFF10B981)
                                  : curso.miEstadoInscripcion == 'PENDIENTE'
                                      ? Colors.amber.shade800
                                      : (isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                            ),
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
                        Text(
                          curso.miRol != null ? 'Rol: ${curso.miRol}' : 'Área de Trabajo',
                          style: const TextStyle(
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

// Modal Moodle para Ficha y Perfil Académico de Participantes
void showPerfilParticipanteModal(
  BuildContext context, {
  required int usuarioId,
  String? fallbackNombre,
  String? fallbackRol,
  String? fallbackEmail,
  String? fallbackFoto,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  final currentUser = StorageService.getCachedUser();
  final esMismo = (currentUser != null && currentUser.id == usuarioId) || (currentUser?.rol == 'ADMIN');

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) {
      return FutureBuilder<Map<String, dynamic>?>(
        future: ApiService.getPerfilPublico(usuarioId),
        builder: (ctx, snapshot) {
          final perfil = snapshot.data;
          final cargando = snapshot.connectionState == ConnectionState.waiting;

          final nombre = (perfil?['nombreCompleto'] as String?)?.isNotEmpty == true
              ? perfil!['nombreCompleto'] as String
              : (fallbackNombre ?? 'Participante');
          final email = (perfil?['email'] as String?)?.isNotEmpty == true
              ? perfil!['email'] as String
              : (fallbackEmail ?? '');
          final rol = (perfil?['rol'] as String?)?.isNotEmpty == true
              ? perfil!['rol'] as String
              : (fallbackRol ?? 'ESTUDIANTE');
          final foto = (perfil?['fotoPerfil'] as String?) ?? fallbackFoto;
          final fotoUrl = ApiService.resolveFileUrl(foto);
          final bio = perfil?['descripcion'] as String?;
          final esPropioPerfil = (perfil?['esPropioPerfil'] as bool? ?? false) || esMismo;
          final ocultarCursos = (perfil?['ocultarCursos'] as bool? ?? false) && !esPropioPerfil;
          final cursos = (perfil?['cursos'] as List<dynamic>?) ?? [];

          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.85,
            ),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkPaper : AppTheme.paper,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
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
                const SizedBox(height: 16),

                // Cabecera con Foto, Nombre y Rol
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: rol == 'DOCENTE'
                          ? AppTheme.accent
                          : (rol == 'JURADO' ? AppTheme.seal : AppTheme.gold),
                      backgroundImage: fotoUrl != null ? NetworkImage(fotoUrl) : null,
                      child: fotoUrl == null
                          ? Text(
                              nombre.isNotEmpty ? nombre[0].toUpperCase() : 'U',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            nombre,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppTheme.darkInk : AppTheme.ink,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          if (email.isNotEmpty)
                            Text(
                              email,
                              style: TextStyle(
                                fontSize: 11.5,
                                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          const SizedBox(height: 6),
                          RoleBadge(role: rol),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 14),

                // Contenido desplazable (Bio y Cursos)
                Flexible(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Biografía / Presentación
                        Text(
                          'Presentación Académica',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppTheme.darkInk : AppTheme.ink,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                          ),
                          child: Text(
                            (bio != null && bio.trim().isNotEmpty)
                                ? bio.trim()
                                : 'Este participante aún no ha redactado una presentación académica.',
                            style: TextStyle(
                              fontSize: 12,
                              color: (bio != null && bio.trim().isNotEmpty)
                                  ? (isDark ? AppTheme.darkInk : AppTheme.ink)
                                  : (isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint),
                              fontStyle: (bio != null && bio.trim().isNotEmpty) ? FontStyle.normal : FontStyle.italic,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Cursos Visibles
                        Row(
                          children: [
                            const Icon(Icons.school_rounded, size: 16, color: AppTheme.accent),
                            const SizedBox(width: 6),
                            Text(
                              'Cursos y Áreas Académicas',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppTheme.darkInk : AppTheme.ink,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        if (cargando)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16),
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accent),
                            ),
                          )
                        else if (ocultarCursos)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0x22F59E0B) : const Color(0x15F59E0B),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0x44F59E0B)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.lock_rounded, size: 16, color: Color(0xFFD97706)),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Este participante ha configurado sus cursos en modo privado.',
                                    style: TextStyle(fontSize: 11.5, color: Color(0xFFD97706)),
                                  ),
                                ),
                              ],
                            ),
                          )
                        else if (cursos.isEmpty)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Center(
                              child: Text(
                                'No tiene materias visibles activas actualmente.',
                                style: TextStyle(fontSize: 11.5, color: AppTheme.inkFaint),
                              ),
                            ),
                          )
                        else
                          ...cursos.map((c) {
                            final titulo = (c['titulo'] ?? 'Área Académica').toString();
                            final tipo = (c['tipo'] ?? 'CONVOCATORIA').toString();
                            final miRol = c['miRol'] as String?;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppTheme.accentSoft,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      tipo,
                                      style: const TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.accentDark,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      titulo,
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (miRol != null) ...[
                                    const SizedBox(width: 8),
                                    RoleBadge(role: miRol),
                                  ],
                                ],
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Cerrar'),
                ),
              ],
            ),
          );
        },
      );
    },
  );
}
