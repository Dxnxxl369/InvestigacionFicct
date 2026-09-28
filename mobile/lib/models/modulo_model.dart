import 'tarea_model.dart';

class ModuloModel {
  final int id;
  final String titulo;
  final String descripcion;
  final String? imagenPortada;
  final int orden;
  final List<TareaModel> tareas;

  ModuloModel({
    required this.id,
    required this.titulo,
    required this.descripcion,
    this.imagenPortada,
    this.orden = 0,
    this.tareas = const [],
  });

  factory ModuloModel.fromJson(Map<String, dynamic> json) {
    return ModuloModel(
      id: json['id'] as int? ?? 0,
      titulo: json['titulo'] as String? ?? 'Módulo',
      descripcion: json['descripcion'] as String? ?? '',
      imagenPortada: json['imagenPortada'] as String?,
      orden: json['orden'] as int? ?? 0,
      tareas: (json['tareas'] as List<dynamic>?)
              ?.map((t) => TareaModel.fromJson(t as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'titulo': titulo,
      'descripcion': descripcion,
      'imagenPortada': imagenPortada,
      'orden': orden,
    };
  }
}
