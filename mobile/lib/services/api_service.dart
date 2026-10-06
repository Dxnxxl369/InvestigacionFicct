import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/user_model.dart';
import '../models/convocatoria_model.dart';
import '../models/modulo_model.dart';
import '../models/tarea_model.dart';
import '../models/actividad_grupo_model.dart';
import 'storage_service.dart';

class ApiService {
  static String? _currentBaseUrl;

  static Future<String> initBaseUrl() async {
    final custom = await StorageService.getServerUrl();
    if (custom != null && custom.isNotEmpty) {
      _currentBaseUrl = custom;
      return custom;
    }

    // Auto-detección inteligente: Probar 192.168.3.42, 192.168.0.15, luego localhost, luego 10.0.2.2
    final candidates = [
      AppConstants.apiBaseUrl, // 192.168.3.42:8080/api
      'http://192.168.0.15:8080/api',
      AppConstants.apiBaseUrlWeb, // localhost:8080/api
      AppConstants.apiBaseUrlEmulator, // 10.0.2.2:8080/api
    ];

    for (final candidate in candidates) {
      try {
        final res = await http.get(Uri.parse('$candidate/public/convocatorias')).timeout(const Duration(milliseconds: 1500));
        if (res.statusCode == 200) {
          _currentBaseUrl = candidate;
          await StorageService.saveServerUrl(candidate);
          return candidate;
        }
      } catch (_) {}
    }

    // Si ninguno respondió en el timeout, fallback al estándar de red local
    if (kIsWeb || defaultTargetPlatform == TargetPlatform.windows) {
      _currentBaseUrl = AppConstants.apiBaseUrlWeb;
    } else {
      _currentBaseUrl = AppConstants.apiBaseUrl;
    }
    return _currentBaseUrl!;
  }

  static String get baseUrl {
    if (_currentBaseUrl != null) return _currentBaseUrl!;
    if (kIsWeb || defaultTargetPlatform == TargetPlatform.windows) {
      return AppConstants.apiBaseUrlWeb;
    }
    return AppConstants.apiBaseUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    _currentBaseUrl = url.trim();
    await StorageService.saveServerUrl(_currentBaseUrl!);
  }

  static String? resolveFileUrl(String? path) {
    if (path == null || path.trim().isEmpty) return null;
    final trimmed = path.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    final host = baseUrl.replaceAll(RegExp(r'/api/?$'), '');
    final cleanPath = trimmed.startsWith('/') ? trimmed : '/$trimmed';
    return '$host$cleanPath';
  }

  static Future<bool> testConnection([String? urlToTest]) async {
    final targetUrl = urlToTest ?? baseUrl;
    try {
      final res = await http.get(
        Uri.parse('$targetUrl/public/convocatorias'),
      ).timeout(const Duration(seconds: 3));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<Map<String, String>> _headers() async {
    final token = await StorageService.getToken();
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // HU-02: Login Real contra PostgreSQL
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email.trim().toLowerCase(), 'password': password}),
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        final token = data['token'] as String;
        final user = UserModel.fromJson(data);
        await StorageService.saveToken(token);
        await StorageService.saveUser(user);
        return {'success': true, 'user': user};
      } else {
        return {'success': false, 'error': 'Credenciales incorrectas (Código ${res.statusCode})'};
      }
    } catch (e) {
      return {'success': false, 'error': 'No se pudo conectar al servidor ($baseUrl). Verifica que tu PC y celular estén en la misma red Wi-Fi.'};
    }
  }

  // Actualizar Perfil Real
  static Future<UserModel> updateProfile({
    String? fotoPerfil,
    String? descripcion,
    bool? ocultarCursos,
  }) async {
    final headers = await _headers();
    final body = <String, dynamic>{};
    if (fotoPerfil != null) body['fotoPerfil'] = fotoPerfil;
    if (descripcion != null) body['descripcion'] = descripcion;
    if (ocultarCursos != null) body['ocultarCursos'] = ocultarCursos;

    final res = await http.put(
      Uri.parse('$baseUrl/auth/me'),
      headers: headers,
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 5));

    if (res.statusCode == 200) {
      final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      final updated = UserModel.fromJson(data);
      await StorageService.saveUser(updated);
      return updated;
    }

    final currentUser = await StorageService.getUser();
    if (currentUser != null) {
      final updated = currentUser.copyWith(
        fotoPerfil: fotoPerfil,
        descripcion: descripcion,
        ocultarCursos: ocultarCursos,
      );
      await StorageService.saveUser(updated);
      return updated;
    }
    throw Exception('Error al actualizar el perfil');
  }

  // Obtener Convocatorias (Si está autenticado como ADMIN o DOCENTE, consulta /convocatorias/admin para ver todas incluidas las recién creadas en borrador)
  static Future<List<ConvocatoriaModel>> getConvocatorias() async {
    try {
      final user = await StorageService.getUser();
      final token = await StorageService.getToken();
      // El listado con borradores y convocatorias no publicadas es exclusivo del ADMIN
      if (user?.rol == 'ADMIN' && token != null && token.isNotEmpty) {
        final headers = await _headers();
        final res = await http.get(
          Uri.parse('$baseUrl/convocatorias/admin'),
          headers: headers,
        ).timeout(const Duration(seconds: 6));

        if (res.statusCode == 200) {
          final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
          return list.map((item) => ConvocatoriaModel.fromJson(item as Map<String, dynamic>)).toList();
        }
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener convocatorias admin: $e');
    }

    // Para Estudiantes, Docentes y visitantes: solo convocatorias publicadas
    return getConvocatoriasPublicas();
  }

  // Obtener Convocatorias Públicas Reales (PostgreSQL)
  static Future<List<ConvocatoriaModel>> getConvocatoriasPublicas() async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/public/convocatorias'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
        return list.map((item) => ConvocatoriaModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener convocatorias públicas: $e');
    }
    return [];
  }

  // Obtener Mis Cursos / Áreas Reales de la BD (según el usuario autenticado)
  static Future<List<ConvocatoriaModel>> getMisAreas() async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/convocatorias/mis-areas'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
        return list.map((item) => ConvocatoriaModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener mis áreas: $e');
    }
    return [];
  }

  // Obtener Detalle de Convocatoria por ID (PostgreSQL)
  static Future<ConvocatoriaModel?> getConvocatoriaDetalle(int id) async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/convocatorias/$id'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        return ConvocatoriaModel.fromJson(data);
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener detalle de convocatoria $id: $e');
    }
    return null;
  }

  // Inscribirse en Convocatoria / Área (PostgreSQL)
  static Future<bool> inscribirseConvocatoria(int convocatoriaId, {String? nombreEquipo}) async {
    try {
      final headers = await _headers();
      final body = <String, dynamic>{};
      if (nombreEquipo != null && nombreEquipo.trim().isNotEmpty) {
        body['nombreEquipo'] = nombreEquipo.trim();
      }

      final res = await http.post(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/inscribirse'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[ApiService] Error al inscribirse en convocatoria $convocatoriaId: $e');
      return false;
    }
  }

  // Declinar / Cancelar postulación
  static Future<bool> declinarSolicitud(int convocatoriaId) async {
    try {
      final headers = await _headers();
      final res = await http.delete(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/declinar-solicitud'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al declinar solicitud: $e');
      return false;
    }
  }

  // Obtener Participantes / Solicitudes Reales de una Convocatoria (Docente / Admin)
  static Future<List<Map<String, dynamic>>> getParticipantes(int convocatoriaId) async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/participantes'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
        return list.map((item) => item as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener participantes de convocatoria $convocatoriaId: $e');
    }
    return [];
  }

  // Docente/Admin: Admitir Solicitud de Inscripción (Persiste en PostgreSQL)
  static Future<bool> admitirParticipante(int convocatoriaId, int participanteId) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/participantes/$participanteId/admitir'),
        headers: headers,
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al admitir participante $participanteId: $e');
      return false;
    }
  }

  // Docente/Admin: Rechazar Solicitud de Inscripción (Persiste en PostgreSQL)
  static Future<bool> rechazarParticipante(int convocatoriaId, int participanteId, {String? motivo}) async {
    try {
      final headers = await _headers();
      final body = {
        'accion': 'RECHAZAR',
        if (motivo != null && motivo.isNotEmpty) 'motivo': motivo,
      };

      final res = await http.put(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/participantes/$participanteId/rechazar'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al rechazar participante $participanteId: $e');
      return false;
    }
  }

  // Admin/Docente: Asignar / Designar Docente o Jurado a la Convocatoria
  static Future<bool> designarParticipante(int convocatoriaId, {required int usuarioId, required String rol}) async {
    try {
      final headers = await _headers();
      final res = await http.post(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/participantes'),
        headers: headers,
        body: jsonEncode({
          'usuarioId': usuarioId,
          'rol': rol,
        }),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[ApiService] Error al designar participante en convocatoria $convocatoriaId: $e');
      return false;
    }
  }

  // Admin/Docente: Remover / Dar de baja a un participante (docente, jurado o estudiante)
  static Future<bool> removerParticipante(int convocatoriaId, int participanteId) async {
    try {
      final headers = await _headers();
      final res = await http.delete(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/participantes/$participanteId'),
        headers: headers,
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[ApiService] Error al remover participante $participanteId: $e');
      return false;
    }
  }

  // Obtener Módulos y Tareas Reales de un Curso (PostgreSQL)
  static Future<List<ModuloModel>> getModulos(int convocatoriaId) async {
    try {
      final headers = await _headers();

      // 1. Obtener módulos reales
      final resMod = await http.get(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/modulos'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      // 2. Obtener tareas reales
      final resTar = await http.get(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/tareas'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      List<TareaModel> todasLasTareas = [];
      if (resTar.statusCode == 200) {
        final rawTareas = jsonDecode(utf8.decode(resTar.bodyBytes)) as List<dynamic>;
        todasLasTareas = rawTareas.map((t) => TareaModel.fromJson(t as Map<String, dynamic>)).toList();
      }

      List<ModuloModel> modulos = [];
      if (resMod.statusCode == 200) {
        final rawModulos = jsonDecode(utf8.decode(resMod.bodyBytes)) as List<dynamic>;
        modulos = rawModulos.map((m) {
          final mJson = m as Map<String, dynamic>;
          final mId = mJson['id'] as int? ?? 0;
          final tareasDelModulo = todasLasTareas.where((t) => t.moduloId == mId).toList();

          return ModuloModel(
            id: mId,
            titulo: mJson['titulo'] as String? ?? 'Módulo',
            descripcion: mJson['descripcion'] as String? ?? '',
            imagenPortada: mJson['imagenUrl'] as String?,
            orden: mJson['orden'] as int? ?? 0,
            tareas: tareasDelModulo,
          );
        }).toList();
      }

      // Tareas que no tienen módulo asignado (ej. tareas sueltas de la materia)
      final tareasSinModulo = todasLasTareas.where((t) => t.moduloId == null || !modulos.any((m) => m.id == t.moduloId)).toList();
      if (tareasSinModulo.isNotEmpty) {
        modulos.insert(
          0,
          ModuloModel(
            id: 0,
            titulo: 'Actividades Generales del Curso',
            descripcion: 'Tareas y entregables del área académica',
            orden: 0,
            tareas: tareasSinModulo,
          ),
        );
      }

      return modulos;
    } catch (e) {
      debugPrint('[ApiService] Error al obtener módulos y tareas reales de $convocatoriaId: $e');
    }
    return [];
  }

  // Docente / Admin: Crear Módulo en PostgreSQL con parámetros completos
  static Future<bool> crearModulo(
    int convocatoriaId, {
    required String titulo,
    String? descripcion,
    int orden = 1,
    String? imagenUrl,
  }) async {
    try {
      final headers = await _headers();
      final body = {
        'titulo': titulo.trim(),
        'descripcion': descripcion?.trim() ?? '',
        'orden': orden,
        'activo': true,
        if (imagenUrl != null && imagenUrl.trim().isNotEmpty) 'imagenUrl': imagenUrl.trim(),
      };

      final res = await http.post(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/modulos'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[ApiService] Error al crear módulo: $e');
      return false;
    }
  }

  // Docente / Admin: Actualizar Módulo en PostgreSQL
  static Future<bool> actualizarModulo(
    int moduloId, {
    required String titulo,
    String? descripcion,
    int orden = 1,
    String? imagenUrl,
  }) async {
    try {
      final headers = await _headers();
      final body = {
        'titulo': titulo.trim(),
        'descripcion': descripcion?.trim() ?? '',
        'orden': orden,
        'activo': true,
        if (imagenUrl != null && imagenUrl.trim().isNotEmpty) 'imagenUrl': imagenUrl.trim(),
      };

      final res = await http.put(
        Uri.parse('$baseUrl/modulos/$moduloId'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al actualizar módulo $moduloId: $e');
      return false;
    }
  }

  // Docente / Admin: Eliminar Módulo en PostgreSQL
  static Future<bool> eliminarModulo(int moduloId) async {
    try {
      final headers = await _headers();
      final res = await http.delete(
        Uri.parse('$baseUrl/modulos/$moduloId'),
        headers: headers,
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200 || res.statusCode == 204;
    } catch (e) {
      debugPrint('[ApiService] Error al eliminar módulo $moduloId: $e');
      return false;
    }
  }

  // Docente / Admin: Crear Tarea Académica en PostgreSQL
  static Future<bool> crearTarea(int convocatoriaId, Map<String, dynamic> data) async {
    try {
      final headers = await _headers();
      final res = await http.post(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/tareas'),
        headers: headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 8));

      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[ApiService] Error al crear tarea: $e');
      return false;
    }
  }

  // Docente / Admin: Actualizar Tarea Académica en PostgreSQL
  static Future<bool> actualizarTarea(int tareaId, Map<String, dynamic> data) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/tareas/$tareaId'),
        headers: headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 8));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al actualizar tarea $tareaId: $e');
      return false;
    }
  }

  // Docente / Admin: Alternar estado de habilitación de tarea
  static Future<bool> toggleHabilitarTarea(int tareaId) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/tareas/$tareaId/habilitar'),
        headers: headers,
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al alternar habilitación de tarea $tareaId: $e');
      return false;
    }
  }

  // Docente / Admin: Crear Actividad de Selección de Grupo (Group Choice)
  static Future<bool> crearActividadGrupo(int convocatoriaId, Map<String, dynamic> data) async {
    try {
      final headers = await _headers();
      final res = await http.post(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/actividades-grupo'),
        headers: headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 8));

      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[ApiService] Error al crear actividad de grupo: $e');
      return false;
    }
  }

  // Docente / Admin: Actualizar Actividad de Selección de Grupo (Group Choice)
  static Future<bool> actualizarActividadGrupo(int convocatoriaId, int actividadId, Map<String, dynamic> data) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/actividades-grupo/$actividadId'),
        headers: headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 8));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al actualizar actividad de grupo $actividadId: $e');
      return false;
    }
  }

  // Docente / Admin: Generar Lote Automático de Grupos
  static Future<bool> generarLoteGrupos(
    int convocatoriaId, {
    required String prefijo,
    required int cantidad,
    required int capacidadMaxima,
    int? actividadGrupoId,
  }) async {
    try {
      final headers = await _headers();
      final body = {
        'prefijo': prefijo.trim(),
        'cantidad': cantidad,
        'capacidadMaxima': capacidadMaxima,
        if (actividadGrupoId != null) 'actividadGrupoId': actividadGrupoId,
      };

      final res = await http.post(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/grupos/generar-lote'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 8));

      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[ApiService] Error al generar lote de grupos: $e');
      return false;
    }
  }

  // Obtener Tareas Reales de Convocatoria (PostgreSQL)
  static Future<List<TareaModel>> getTareas(int convocatoriaId) async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/tareas'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
        return list.map((item) => TareaModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener tareas de $convocatoriaId: $e');
    }
    return [];
  }

  // Estudiante: Entregar Tarea en PostgreSQL
  static Future<bool> entregarTarea(
    int tareaId, {
    String? comentario,
    String? nombreArchivo,
    String? archivoUrl,
    int? grupoId,
  }) async {
    try {
      final headers = await _headers();
      final body = {
        'nombreArchivo': nombreArchivo ?? 'entrega_estudiante.pdf',
        'archivoUrl': archivoUrl ?? '/api/uploads/entrega_${DateTime.now().millisecondsSinceEpoch}.pdf',
        if (comentario != null && comentario.isNotEmpty) 'comentarioEstudiante': comentario,
        if (grupoId != null) 'grupoId': grupoId,
      };

      final res = await http.post(
        Uri.parse('$baseUrl/tareas/$tareaId/entregar'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al entregar tarea $tareaId: $e');
      return false;
    }
  }

  // Docente: Obtener todas las entregas reales para SpeedGrader (PostgreSQL)
  static Future<List<Map<String, dynamic>>> getEntregasPorTarea(int tareaId) async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/tareas/$tareaId/entregas'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
        return list.map((item) => item as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener entregas de tarea $tareaId: $e');
    }
    return [];
  }

  // Docente: Calificar Entrega en SpeedGrader (Persiste en PostgreSQL)
  static Future<bool> calificarEntrega(
    int entregaId, {
    required double calificacion,
    String? retroalimentacion,
  }) async {
    try {
      final headers = await _headers();
      final body = {
        'calificacion': calificacion,
        'retroalimentacion': retroalimentacion ?? '',
      };

      final res = await http.post(
        Uri.parse('$baseUrl/entregas/$entregaId/calificar'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al calificar entrega $entregaId: $e');
      return false;
    }
  }

  // ==========================================
  // ACTIVIDADES DE SELECCIÓN DE GRUPO (MOODLE)
  // ==========================================

  // Listar actividades de elección de grupo en un área
  static Future<List<ActividadGrupoModel>> getActividadesGrupo(int convocatoriaId) async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/actividades-grupo'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
        return list.map((item) => ActividadGrupoModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener actividades de grupo de $convocatoriaId: $e');
    }
    return [];
  }

  // Estudiante: Elegir grupo en una actividad (Moodle Choice)
  static Future<ActividadGrupoModel?> elegirGrupo(int convocatoriaId, int actividadId, int grupoId) async {
    try {
      final headers = await _headers();
      final res = await http.post(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/actividades-grupo/$actividadId/elegir'),
        headers: headers,
        body: jsonEncode({'grupoId': grupoId}),
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        return ActividadGrupoModel.fromJson(data);
      }
    } catch (e) {
      debugPrint('[ApiService] Error al elegir grupo $grupoId en act $actividadId: $e');
    }
    return null;
  }

  // Estudiante: Anular su elección de grupo
  static Future<bool> anularEleccionGrupo(int convocatoriaId, int actividadId) async {
    try {
      final headers = await _headers();
      final res = await http.delete(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/actividades-grupo/$actividadId/elegir'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al anular eleccion de grupo en act $actividadId: $e');
      return false;
    }
  }

  // ==========================================
  // GESTIÓN DE GRUPOS & EQUIPOS EN ÁREA (DOCENTE / ADMIN)
  // ==========================================

  // Obtener resumen de grupos y métricas del área
  static Future<Map<String, dynamic>?> getGruposArea(int convocatoriaId) async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/grupos'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener grupos del area $convocatoriaId: $e');
    }
    return null;
  }

  // Docente/Admin: Crear nuevo grupo
  static Future<GrupoModel?> crearGrupo(
    int convocatoriaId, {
    required String nombre,
    String? descripcion,
    int? capacidadMaxima,
    int? actividadGrupoId,
  }) async {
    try {
      final headers = await _headers();
      final body = {
        'nombre': nombre,
        'descripcion': descripcion ?? '',
        'capacidadMaxima': capacidadMaxima ?? 5,
        if (actividadGrupoId != null) 'actividadGrupoId': actividadGrupoId,
      };

      final res = await http.post(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/grupos'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 201 || res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        return GrupoModel.fromJson(data);
      }
    } catch (e) {
      debugPrint('[ApiService] Error al crear grupo en area $convocatoriaId: $e');
    }
    return null;
  }

  // Docente/Admin: Remover estudiante de un grupo
  static Future<bool> removerMiembroGrupo(int convocatoriaId, int grupoId, int participanteId) async {
    try {
      final headers = await _headers();
      final res = await http.delete(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/grupos/$grupoId/miembros/$participanteId'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al remover estudiante $participanteId del grupo $grupoId: $e');
      return false;
    }
  }

  // ==========================================
  // ADMINISTRACIÓN DE CONVOCATORIAS (ADMIN ONLY)
  // ==========================================

  // Obtener catálogo de docentes y jurados para asignar como encargados
  static Future<Map<String, List<Map<String, dynamic>>>> getEncargadosDisponibles() async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/convocatorias/encargados-disponibles'),
        headers: headers,
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        final docs = (data['docentes'] as List<dynamic>? ?? [])
            .map((e) => e as Map<String, dynamic>)
            .toList();
        final jurs = (data['jurados'] as List<dynamic>? ?? [])
            .map((e) => e as Map<String, dynamic>)
            .toList();
        return {'docentes': docs, 'jurados': jurs};
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener encargados disponibles: $e');
    }
    return {'docentes': [], 'jurados': []};
  }

  // Admin: Publicar convocatoria en el portal
  static Future<bool> publicarConvocatoria(int convocatoriaId) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/convocatorias/$convocatoriaId/publicar'),
        headers: headers,
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al publicar convocatoria $convocatoriaId: $e');
      return false;
    }
  }

  // Admin: Crear nueva convocatoria
  static Future<Map<String, dynamic>?> crearConvocatoria(Map<String, dynamic> data) async {
    try {
      final headers = await _headers();
      final res = await http.post(
        Uri.parse('$baseUrl/convocatorias'),
        headers: headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 8));

      if (res.statusCode == 201 || res.statusCode == 200) {
        return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('[ApiService] Error al crear convocatoria: $e');
    }
    return null;
  }

  // Admin: Actualizar convocatoria existente
  static Future<bool> actualizarConvocatoria(int id, Map<String, dynamic> data) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/convocatorias/$id'),
        headers: headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 8));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al actualizar convocatoria $id: $e');
      return false;
    }
  }

  // Obtener Perfil Público / Ficha Académica de un Usuario (para visualizar otros participantes)
  static Future<Map<String, dynamic>?> getPerfilPublico(int usuarioId) async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/auth/usuarios/$usuarioId/perfil-publico'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener perfil público del usuario $usuarioId: $e');
    }
    return null;
  }

  // Subir imagen al backend (Multipart /api/uploads/imagen)
  static Future<Map<String, dynamic>?> subirImagen(Uint8List bytes, String filename) async {
    try {
      final token = await StorageService.getToken();
      final uri = Uri.parse('$baseUrl/uploads/imagen');
      final request = http.MultipartRequest('POST', uri);
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.files.add(
        http.MultipartFile.fromBytes('file', bytes, filename: filename),
      );
      final streamedResponse = await request.send().timeout(const Duration(seconds: 15));
      final response = await http.Response.fromStream(streamedResponse);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
      } else {
        debugPrint('[ApiService] Error subirImagen status: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error al subir imagen: $e');
    }
    return null;
  }

  // Subir documento al backend (Multipart /api/uploads/documento)
  static Future<Map<String, dynamic>?> subirDocumento(Uint8List bytes, String filename) async {
    try {
      final token = await StorageService.getToken();
      final uri = Uri.parse('$baseUrl/uploads/documento');
      final request = http.MultipartRequest('POST', uri);
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.files.add(
        http.MultipartFile.fromBytes('file', bytes, filename: filename),
      );
      final streamedResponse = await request.send().timeout(const Duration(seconds: 25));
      final response = await http.Response.fromStream(streamedResponse);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
      } else {
        debugPrint('[ApiService] Error subirDocumento status: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error al subir documento: $e');
    }
    return null;
  }

  // ==========================================
  // DOCUMENTOS & INVESTIGACIÓN (/api/documentos)
  // ==========================================

  static Future<List<Map<String, dynamic>>> getDocumentos() async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/documentos'),
        headers: headers,
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
        return list.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('[ApiService] Error al listar documentos: $e');
    }
    return [];
  }

  static Future<Map<String, dynamic>?> getDocumento(int id) async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/documentos/$id'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener documento $id: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> crearDocumento(Map<String, dynamic> data) async {
    try {
      final headers = await _headers();
      final res = await http.post(
        Uri.parse('$baseUrl/documentos'),
        headers: headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200 || res.statusCode == 201) {
        return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('[ApiService] Error al crear documento: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> actualizarDocumento(int id, Map<String, dynamic> data) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/documentos/$id'),
        headers: headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('[ApiService] Error al actualizar documento $id: $e');
    }
    return null;
  }

  static Future<bool> eliminarDocumento(int id) async {
    try {
      final headers = await _headers();
      final res = await http.delete(
        Uri.parse('$baseUrl/documentos/$id'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al eliminar documento $id: $e');
      return false;
    }
  }

  // ==========================================
  // GESTIÓN DE USUARIOS (ADMIN) (/api/admin/users)
  // ==========================================

  static Future<List<Map<String, dynamic>>> getAdminUsers({String? query}) async {
    try {
      final headers = await _headers();
      String url = '$baseUrl/admin/users';
      if (query != null && query.trim().isNotEmpty) {
        url += '?query=${Uri.encodeComponent(query.trim())}';
      }
      final res = await http.get(
        Uri.parse(url),
        headers: headers,
      ).timeout(const Duration(seconds: 7));

      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
        return list.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('[ApiService] Error al listar usuarios admin: $e');
    }
    return [];
  }

  static Future<bool> updateUserRole(int id, String newRole) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/admin/users/$id/role'),
        headers: headers,
        body: jsonEncode({'rol': newRole}),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al actualizar rol usuario $id: $e');
      return false;
    }
  }

  static Future<bool> updateUserStatus(int id, String newStatus) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/admin/users/$id/status'),
        headers: headers,
        body: jsonEncode({'estado': newStatus}),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al actualizar estado usuario $id: $e');
      return false;
    }
  }

  // ==========================================
  // MATRIZ DE PERMISOS (/api/permisos)
  // ==========================================

  static Future<List<Map<String, dynamic>>> getPermisos() async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/permisos'),
        headers: headers,
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
        return list.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('[ApiService] Error al obtener matriz de permisos: $e');
    }
    return [];
  }

  static Future<bool> updatePermiso(String rol, String modulo, bool puedeVer, bool puedeEditar) async {
    try {
      final headers = await _headers();
      final res = await http.put(
        Uri.parse('$baseUrl/permisos'),
        headers: headers,
        body: jsonEncode({
          'rol': rol,
          'modulo': modulo,
          'puedeVer': puedeVer,
          'puedeEditar': puedeEditar,
        }),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] Error al actualizar permiso $rol / $modulo: $e');
      return false;
    }
  }
}

