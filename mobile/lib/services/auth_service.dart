import 'package:flutter/material.dart';
import '../models/user_model.dart';
import 'api_service.dart';
import 'storage_service.dart';

class AuthService extends ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = true;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;

  AuthService() {
    _loadSession();
  }

  Future<void> _loadSession() async {
    _isLoading = true;
    notifyListeners();

    _currentUser = await StorageService.getUser();
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await ApiService.login(email, password);
      if (res['success'] == true) {
        _currentUser = res['user'] as UserModel;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> switchRole(String newRole) async {
    if (_currentUser == null) return;
    String newEmail;
    String newNombre;
    String newApellido;

    if (newRole == 'DOCENTE') {
      newNombre = 'Rolando';
      newApellido = 'Martínez';
      newEmail = 'rmartinez@uagrm.edu.bo';
    } else if (newRole == 'ESTUDIANTE') {
      newNombre = 'Carlos';
      newApellido = 'Méndez';
      newEmail = 'cmendez@uagrm.edu.bo';
    } else if (newRole == 'JURADO') {
      newNombre = 'Julio';
      newApellido = 'Cabrera';
      newEmail = 'jcabrera@uagrm.edu.bo';
    } else {
      newNombre = 'Admin';
      newApellido = 'FICCT';
      newEmail = 'admin@ficct.uagrm.edu.bo';
    }

    _currentUser = UserModel(
      id: _currentUser!.id,
      nombre: newNombre,
      apellido: newApellido,
      email: newEmail,
      rol: newRole,
      estado: 'ACTIVO',
      fotoPerfil: _currentUser!.fotoPerfil,
      descripcion: _currentUser!.descripcion,
      ocultarCursos: _currentUser!.ocultarCursos,
    );

    await StorageService.saveUser(_currentUser!);
    notifyListeners();
  }

  Future<void> updateProfile({
    String? fotoPerfil,
    String? descripcion,
    bool? ocultarCursos,
  }) async {
    if (_currentUser == null) return;
    final updated = await ApiService.updateProfile(
      fotoPerfil: fotoPerfil,
      descripcion: descripcion,
      ocultarCursos: ocultarCursos,
    );
    _currentUser = updated;
    notifyListeners();
  }

  Future<void> logout() async {
    await StorageService.clearAuth();
    _currentUser = null;
    notifyListeners();
  }
}
