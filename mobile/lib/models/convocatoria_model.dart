class ConvocatoriaModel {
  final int id;
  final String titulo;
  final String descripcion;
  final String tipo; // FERIA, HACKATHON, CONCURSO, INVESTIGACION
  final String estado; // BORRADOR, PUBLICADA, FINALIZADA
  final String? fechaCierre;
  final String? tamanoEquipo;
  final String? imagenPortada;
  final int? creadorId;
  final String? creadorNombre;
  final List<String> requisitos;
  final List<int> docenteIds;
  final List<int> juradoIds;
  final List<String> docentesEncargados;
  final List<String> juradosAsignados;
  final String? miEstadoInscripcion;
  final String? miRol;

  ConvocatoriaModel({
    required this.id,
    required this.titulo,
    required this.descripcion,
    required this.tipo,
    required this.estado,
    this.fechaCierre,
    this.tamanoEquipo,
    this.imagenPortada,
    this.creadorId,
    this.creadorNombre,
    this.requisitos = const [],
    this.docenteIds = const [],
    this.juradoIds = const [],
    this.docentesEncargados = const [],
    this.juradosAsignados = const [],
    this.miEstadoInscripcion,
    this.miRol,
  });

  factory ConvocatoriaModel.fromJson(Map<String, dynamic> json) {
    return ConvocatoriaModel(
      id: json['id'] as int? ?? 0,
      titulo: json['titulo'] as String? ?? 'Sin título',
      descripcion: json['descripcion'] as String? ?? '',
      tipo: json['tipo'] as String? ?? 'FERIA',
      estado: json['estado'] as String? ?? 'PUBLICADA',
      fechaCierre: json['fechaCierre'] as String?,
      tamanoEquipo: json['tamanoEquipo'] as String?,
      imagenPortada: json['imagenPortada'] as String?,
      creadorId: json['creadorId'] as int?,
      creadorNombre: json['creadorNombre'] as String?,
      requisitos: (json['requisitos'] as List<dynamic>?)?.map((e) {
        if (e is Map<String, dynamic>) {
          return (e['descripcion'] ?? e['requisito'] ?? '').toString();
        }
        return e.toString();
      }).where((s) => s.isNotEmpty).toList() ?? [],
      docenteIds: (json['docenteIds'] as List<dynamic>?)?.map((e) => (e as num).toInt()).toList() ?? [],
      juradoIds: (json['juradoIds'] as List<dynamic>?)?.map((e) => (e as num).toInt()).toList() ?? [],
      docentesEncargados: (json['docentesEncargados'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      juradosAsignados: (json['juradosAsignados'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      miEstadoInscripcion: json['miEstadoInscripcion'] as String?,
      miRol: json['miRol'] as String? ?? (json['rol'] as String?),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'titulo': titulo,
      'descripcion': descripcion,
      'tipo': tipo,
      'estado': estado,
      'fechaCierre': fechaCierre,
      'tamanoEquipo': tamanoEquipo,
      'imagenPortada': imagenPortada,
    };
  }
}
