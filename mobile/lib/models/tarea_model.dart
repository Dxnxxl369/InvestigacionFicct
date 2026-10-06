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

  final bool esGrupal;
  final double? puntajeMaximo;
  final int? entregaId;
  final String? comentarioEstudiante;
  final bool habilitada;
  final int? actividadGrupoId;

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
    this.esGrupal = false,
    this.puntajeMaximo = 100,
    this.entregaId,
    this.comentarioEstudiante,
    this.habilitada = true,
    this.actividadGrupoId,
  });

  factory TareaModel.fromJson(Map<String, dynamic> json) {
    final miEntrega = json['miEntrega'] as Map<String, dynamic>?;

    final String estado;
    if (miEntrega != null) {
      estado = (miEntrega['estado'] ?? 'ENTREGADO').toString();
    } else {
      estado = (json['estadoEntrega'] ?? 'SIN_ENTREGAR').toString();
    }

    final double? calif = miEntrega != null
        ? (miEntrega['calificacion'] as num?)?.toDouble()
        : (json['calificacion'] as num?)?.toDouble();

    final String? retro = miEntrega != null
        ? miEntrega['retroalimentacion'] as String?
        : json['retroalimentacion'] as String?;

    final String? archUrl = miEntrega != null
        ? miEntrega['archivoUrl'] as String?
        : json['archivoUrl'] as String?;

    final String? archNom = miEntrega != null
        ? miEntrega['nombreArchivo'] as String?
        : json['archivoNombre'] as String?;

    final int? entId = miEntrega != null ? (miEntrega['id'] as num?)?.toInt() : null;
    final String? coment = miEntrega != null ? miEntrega['comentarioEstudiante'] as String? : null;

    return TareaModel(
      id: json['id'] as int? ?? 0,
      titulo: json['titulo'] as String? ?? 'Sin título',
      descripcion: json['descripcion'] as String? ?? '',
      moduloId: (json['moduloId'] as num?)?.toInt(),
      moduloTitulo: json['moduloTitulo'] as String?,
      fechaApertura: (json['fechaHabilitacion'] ?? json['fechaApertura']) as String?,
      fechaLimite: (json['fechaEntrega'] ?? json['fechaLimite']) as String?,
      fechaCorte: json['fechaCorte'] as String?,
      tiposPermitidos: (json['tiposArchivosPermitidos'] ?? json['tiposPermitidos'] ?? '.pdf, .docx, .zip') as String?,
      tamanoMaximoMb: (json['tamanoMaximoMb'] as num?)?.toInt() ?? 10,
      estadoEntrega: estado,
      archivoUrl: archUrl,
      archivoNombre: archNom,
      calificacion: calif,
      retroalimentacion: retro,
      esGrupal: json['esGrupal'] as bool? ?? false,
      puntajeMaximo: (json['puntajeMaximo'] as num?)?.toDouble() ?? 100,
      entregaId: entId,
      comentarioEstudiante: coment,
      habilitada: json['habilitada'] as bool? ?? true,
      actividadGrupoId: (json['actividadGrupoId'] as num?)?.toInt(),
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
      'estadoEntrega': estadoEntrega,
      'esGrupal': esGrupal,
    };
  }
}
