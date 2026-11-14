import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';
import 'storage_service.dart';

class BibliotecaApi {
  static Future<Map<String, String>> _headers() async {
    final token = await StorageService.getToken();
    return token == null ? {} : {'Authorization': 'Bearer $token'};
  }

  static Future<dynamic> _get(String ruta, [Map<String, String>? parametros]) async {
    final uri = Uri.parse('${ApiService.baseUrl}/biblioteca$ruta')
        .replace(queryParameters: parametros?.isEmpty == true ? null : parametros);
    final respuesta = await http.get(uri, headers: await _headers());
    if (respuesta.statusCode != 200) {
      try {
        final error = jsonDecode(utf8.decode(respuesta.bodyBytes));
        throw Exception(error['error'] ?? 'No se pudo consultar la biblioteca.');
      } on FormatException {
        throw Exception('No se pudo consultar la biblioteca (${respuesta.statusCode}).');
      }
    }
    return jsonDecode(utf8.decode(respuesta.bodyBytes));
  }

  static Future<List<Map<String, dynamic>>> categorias() async =>
      (await _get('/categorias') as List).cast<Map<String, dynamic>>();

  static Future<Map<String, dynamic>> filtros() async =>
      (await _get('/filtros') as Map).cast<String, dynamic>();

  static Future<List<Map<String, dynamic>>> documentos({String? texto, String? categoriaId,
      String? area, String? nivel}) async {
    final parametros = <String, String>{};
    if (texto != null && texto.trim().isNotEmpty) parametros['texto'] = texto.trim();
    if (categoriaId != null && categoriaId.isNotEmpty) parametros['categoriaId'] = categoriaId;
    if (area != null && area.isNotEmpty) parametros['area'] = area;
    if (nivel != null && nivel.isNotEmpty) parametros['nivel'] = nivel;
    return (await _get('/documentos', parametros) as List).cast<Map<String, dynamic>>();
  }

  static Future<List<Map<String, dynamic>>> recomendaciones() async =>
      (await _get('/recomendaciones') as List).cast<Map<String, dynamic>>();

  static String archivoUrl(int id) => '${ApiService.baseUrl}/biblioteca/documentos/$id/archivo';
  static String portadaUrl(int id) => '${ApiService.baseUrl}/biblioteca/documentos/$id/portada';
  static Future<Map<String, String>> portadaHeaders() => _headers();
}
