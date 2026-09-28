class UserModel {
  final int id;
  final String nombre;
  final String apellido;
  final String email;
  final String rol; // ADMIN, DOCENTE, JURADO, ESTUDIANTE
  final String estado;
  final String? fotoPerfil;
  final String? descripcion;
  final bool ocultarCursos;

  UserModel({
    required this.id,
    required this.nombre,
    required this.apellido,
    required this.email,
    required this.rol,
    required this.estado,
    this.fotoPerfil,
    this.descripcion,
    this.ocultarCursos = false,
  });

  String get nombreCompleto => '$nombre $apellido';
  String get inicial => nombre.isNotEmpty ? nombre[0].toUpperCase() : 'U';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as int? ?? 0,
      nombre: json['nombre'] as String? ?? '',
      apellido: json['apellido'] as String? ?? '',
      email: json['email'] as String? ?? '',
      rol: json['rol'] as String? ?? 'ESTUDIANTE',
      estado: json['estado'] as String? ?? 'ACTIVO',
      fotoPerfil: json['fotoPerfil'] as String?,
      descripcion: json['descripcion'] as String?,
      ocultarCursos: json['ocultarCursos'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombre': nombre,
      'apellido': apellido,
      'email': email,
      'rol': rol,
      'estado': estado,
      'fotoPerfil': fotoPerfil,
      'descripcion': descripcion,
      'ocultarCursos': ocultarCursos,
    };
  }

  UserModel copyWith({
    String? fotoPerfil,
    String? descripcion,
    bool? ocultarCursos,
  }) {
    return UserModel(
      id: id,
      nombre: nombre,
      apellido: apellido,
      email: email,
      rol: rol,
      estado: estado,
      fotoPerfil: fotoPerfil ?? this.fotoPerfil,
      descripcion: descripcion ?? this.descripcion,
      ocultarCursos: ocultarCursos ?? this.ocultarCursos,
    );
  }
}
