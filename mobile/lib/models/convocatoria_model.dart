class ConvocatoriaModel {
  final int id;
  final String titulo;
  final String descripcion;
  final String tipo; // FERIA, HACKATHON, CONCURSO, INVESTIGACION
  final String estado; // BORRADOR, PUBLICADA, FINALIZADA
  final String? fechaCierre;
  final String? imagenPortada;
  final int? creadorId;
  final String? creadorNombre;
  final List<int> docenteIds;
  final List<int> juradoIds;
  final List<String> docentesEncargados;
  final List<String> juradosAsignados;
  final String? miEstadoInscripcion;

  ConvocatoriaModel({
    required this.id,
    required this.titulo,
    required this.descripcion,
    required this.tipo,
    required this.estado,
    this.fechaCierre,
    this.imagenPortada,
    this.creadorId,
    this.creadorNombre,
    this.docenteIds = const [],
    this.juradoIds = const [],
    this.docentesEncargados = const [],
    this.juradosAsignados = const [],
    this.miEstadoInscripcion,
  });

  factory ConvocatoriaModel.fromJson(Map<String, dynamic> json) {
    return ConvocatoriaModel(
      id: json['id'] as int? ?? 0,
      titulo: json['titulo'] as String? ?? 'Sin título',
      descripcion: json['descripcion'] as String? ?? '',
      tipo: json['tipo'] as String? ?? 'FERIA',
      estado: json['estado'] as String? ?? 'PUBLICADA',
      fechaCierre: json['fechaCierre'] as String?,
      imagenPortada: json['imagenPortada'] as String?,
      creadorId: json['creadorId'] as int?,
      creadorNombre: json['creadorNombre'] as String?,
      docenteIds: (json['docenteIds'] as List<dynamic>?)?.map((e) => e as int).toList() ?? [],
      juradoIds: (json['juradoIds'] as List<dynamic>?)?.map((e) => e as int).toList() ?? [],
      docentesEncargados: (json['docentesEncargados'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      juradosAsignados: (json['juradosAsignados'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      miEstadoInscripcion: json['miEstadoInscripcion'] as String?,
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
      'imagenPortada': imagenPortada,
    };
  }
}
