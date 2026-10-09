import 'package:flutter/material.dart';
import '../models/user_model.dart';
import 'api_service.dart';
import 'storage_service.dart';
import 'fcm_service.dart';

class AuthService extends ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = true;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;
  bool get isDocente => _currentUser?.rol == 'DOCENTE';
  bool get isEstudiante => _currentUser?.rol == 'ESTUDIANTE';

  AuthService() {
    _loadSession();
  }

  Future<void> _loadSession() async {
    _isLoading = true;
    notifyListeners();

    _currentUser = await StorageService.getUser();
    if (_currentUser != null) {
      FcmService.syncTokenWithBackend();
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await ApiService.login(email, password, FcmService.currentToken);
      if (res['success'] == true) {
        _currentUser = res['user'] as UserModel;
        _isLoading = false;
        notifyListeners();
        FcmService.syncTokenWithBackend();
        return true;
      }
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> switchRole(String newRole) async {
    String email;
    String password;

    if (newRole == 'DOCENTE') {
      email = 'rmartinez@uagrm.edu.bo';
      password = 'docente123';
    } else if (newRole == 'ESTUDIANTE') {
      email = 'daniel.quispe@uagrm.edu.bo';
      password = 'estudiante123';
    } else if (newRole == 'JURADO') {
      email = 'cfernandez@uagrm.edu.bo';
      password = 'jurado123';
    } else {
      email = 'admin@uagrm.edu.bo';
      password = 'admin369';
    }

    final success = await login(email, password);
    if (!success) {
      debugPrint('[AuthService] Falló switchRole autenticado para $newRole ($email)');
    }
    return success;
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
