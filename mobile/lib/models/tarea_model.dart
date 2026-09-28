class TareaModel {
  final int id;
  final String titulo;
  final String descripcion;
  final int? moduloId;
  final String? moduloTitulo;
  final String? fechaApertura;
  final String? fechaLimite;
  final String? fechaCorte;
  final String? tiposPermitidos;
  final int tamanoMaximoMb;
  final String? estadoEntrega;
  final String? archivoUrl;
  final String? archivoNombre;
  final double? calificacion;
  final String? retroalimentacion;

  TareaModel({
    required this.id,
    required this.titulo,
    required this.descripcion,
    this.moduloId,
    this.moduloTitulo,
    this.fechaApertura,
    this.fechaLimite,
    this.fechaCorte,
    this.tiposPermitidos = '.pdf, .docx, .zip',
    this.tamanoMaximoMb = 10,
    this.estadoEntrega = 'SIN_ENTREGAR',
    this.archivoUrl,
    this.archivoNombre,
    this.calificacion,
    this.retroalimentacion,
  });

  factory TareaModel.fromJson(Map<String, dynamic> json) {
    return TareaModel(
      id: json['id'] as int? ?? 0,
      titulo: json['titulo'] as String? ?? 'Sin título',
      descripcion: json['descripcion'] as String? ?? '',
      moduloId: json['moduloId'] as int?,
      moduloTitulo: json['moduloTitulo'] as String?,
      fechaApertura: json['fechaApertura'] as String?,
      fechaLimite: json['fechaLimite'] as String?,
      fechaCorte: json['fechaCorte'] as String?,
      tiposPermitidos: json['tiposPermitidos'] as String? ?? '.pdf, .docx, .zip',
      tamanoMaximoMb: json['tamanoMaximoMb'] as int? ?? 10,
      estadoEntrega: json['estadoEntrega'] as String? ?? 'SIN_ENTREGAR',
      archivoUrl: json['archivoUrl'] as String?,
      archivoNombre: json['archivoNombre'] as String?,
      calificacion: (json['calificacion'] as num?)?.toDouble(),
      retroalimentacion: json['retroalimentacion'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'titulo': titulo,
      'descripcion': descripcion,
      'moduloId': moduloId,
      'fechaApertura': fechaApertura,
      'fechaLimite': fechaLimite,
      'fechaCorte': fechaCorte,
      'tiposPermitidos': tiposPermitidos,
      'tamanoMaximoMb': tamanoMaximoMb,
    };
  }
}
