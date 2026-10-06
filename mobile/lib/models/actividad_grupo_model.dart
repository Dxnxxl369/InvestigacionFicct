class MiembroGrupoModel {
  final int participanteId;
  final int usuarioId;
  final String nombreCompleto;
  final String email;
  final String rol;

  MiembroGrupoModel({
    required this.participanteId,
    required this.usuarioId,
    required this.nombreCompleto,
    required this.email,
    required this.rol,
  });

  factory MiembroGrupoModel.fromJson(Map<String, dynamic> json) {
    return MiembroGrupoModel(
      participanteId: (json['participanteId'] as num?)?.toInt() ?? 0,
      usuarioId: (json['usuarioId'] as num?)?.toInt() ?? 0,
      nombreCompleto: (json['nombreCompleto'] ?? json['nombre'] ?? 'Estudiante').toString(),
      email: (json['email'] ?? '').toString(),
      rol: (json['rol'] ?? 'ESTUDIANTE').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'participanteId': participanteId,
    'usuarioId': usuarioId,
    'nombreCompleto': nombreCompleto,
    'email': email,
    'rol': rol,
  };
}

class GrupoModel {
  final int id;
  final int? convocatoriaId;
  final int? actividadGrupoId;
  final String nombre;
  final String? descripcion;
  final int capacidadMaxima;
  final int cantidadMiembros;
  final bool completo;
  final List<MiembroGrupoModel> miembros;

  GrupoModel({
    required this.id,
    this.convocatoriaId,
    this.actividadGrupoId,
    required this.nombre,
    this.descripcion,
    this.capacidadMaxima = 5,
    this.cantidadMiembros = 0,
    this.completo = false,
    this.miembros = const [],
  });

  factory GrupoModel.fromJson(Map<String, dynamic> json) {
    var rawMiembros = json['miembros'] as List<dynamic>? ?? [];
    return GrupoModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      convocatoriaId: (json['convocatoriaId'] as num?)?.toInt(),
      actividadGrupoId: (json['actividadGrupoId'] as num?)?.toInt(),
      nombre: (json['nombre'] ?? 'Grupo').toString(),
      descripcion: json['descripcion'] as String?,
      capacidadMaxima: (json['capacidadMaxima'] as num?)?.toInt() ?? 5,
      cantidadMiembros: (json['cantidadMiembros'] as num?)?.toInt() ?? rawMiembros.length,
      completo: json['completo'] as bool? ?? false,
      miembros: rawMiembros.map((m) => MiembroGrupoModel.fromJson(m as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'convocatoriaId': convocatoriaId,
    'actividadGrupoId': actividadGrupoId,
    'nombre': nombre,
    'descripcion': descripcion,
    'capacidadMaxima': capacidadMaxima,
    'cantidadMiembros': cantidadMiembros,
    'completo': completo,
    'miembros': miembros.map((m) => m.toJson()).toList(),
  };
}

class ActividadGrupoModel {
  final int id;
  final int convocatoriaId;
  final int? moduloId;
  final String titulo;
  final String descripcion;
  final String? fechaApertura;
  final String? fechaCierre;
  final int capacidadPorGrupo;
  final bool permitirCambio;
  final bool mostrarMiembros;
  final bool habilitada;
  final bool abierta;
  final bool cerrada;
  final int? grupoSeleccionadoId;
  final String? grupoSeleccionadoNombre;
  final List<GrupoModel> grupos;

  ActividadGrupoModel({
    required this.id,
    required this.convocatoriaId,
    this.moduloId,
    required this.titulo,
    required this.descripcion,
    this.fechaApertura,
    this.fechaCierre,
    this.capacidadPorGrupo = 5,
    this.permitirCambio = true,
    this.mostrarMiembros = true,
    this.habilitada = true,
    this.abierta = true,
    this.cerrada = false,
    this.grupoSeleccionadoId,
    this.grupoSeleccionadoNombre,
    this.grupos = const [],
  });

  factory ActividadGrupoModel.fromJson(Map<String, dynamic> json) {
    var rawGrupos = json['grupos'] as List<dynamic>? ?? [];
    return ActividadGrupoModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      convocatoriaId: (json['convocatoriaId'] as num?)?.toInt() ?? 0,
      moduloId: (json['moduloId'] as num?)?.toInt(),
      titulo: (json['titulo'] ?? 'Actividad de Selección de Grupo').toString(),
      descripcion: (json['descripcion'] ?? '').toString(),
      fechaApertura: json['fechaApertura'] as String?,
      fechaCierre: json['fechaCierre'] as String?,
      capacidadPorGrupo: (json['capacidadPorGrupo'] as num?)?.toInt() ?? 5,
      permitirCambio: json['permitirCambio'] as bool? ?? true,
      mostrarMiembros: json['mostrarMiembros'] as bool? ?? true,
      habilitada: json['habilitada'] as bool? ?? true,
      abierta: json['abierta'] as bool? ?? true,
      cerrada: json['cerrada'] as bool? ?? false,
      grupoSeleccionadoId: (json['grupoSeleccionadoId'] as num?)?.toInt(),
      grupoSeleccionadoNombre: json['grupoSeleccionadoNombre'] as String?,
      grupos: rawGrupos.map((g) => GrupoModel.fromJson(g as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'convocatoriaId': convocatoriaId,
    'moduloId': moduloId,
    'titulo': titulo,
    'descripcion': descripcion,
    'fechaApertura': fechaApertura,
    'fechaCierre': fechaCierre,
    'capacidadPorGrupo': capacidadPorGrupo,
    'permitirCambio': permitirCambio,
    'mostrarMiembros': mostrarMiembros,
    'habilitada': habilitada,
    'abierta': abierta,
    'cerrada': cerrada,
    'grupoSeleccionadoId': grupoSeleccionadoId,
    'grupoSeleccionadoNombre': grupoSeleccionadoNombre,
    'grupos': grupos.map((g) => g.toJson()).toList(),
  };
}
