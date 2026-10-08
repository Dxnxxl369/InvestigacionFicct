import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import '../models/user_model.dart';

class StorageService {
  static SharedPreferences? _prefs;
  static UserModel? _cachedUser;

  static Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
    if (_cachedUser == null && _prefs != null) {
      final userStr = _prefs?.getString(AppConstants.userKey);
      if (userStr != null) {
        try {
          _cachedUser = UserModel.fromJson(jsonDecode(userStr) as Map<String, dynamic>);
        } catch (_) {}
      }
    }
  }

  static Future<void> saveServerUrl(String url) async {
    await init();
    await _prefs?.setString(AppConstants.serverUrlKey, url.trim());
  }

  static Future<String?> getServerUrl() async {
    await init();
    return _prefs?.getString(AppConstants.serverUrlKey);
  }

  static Future<void> saveToken(String token) async {
    await init();
    await _prefs?.setString(AppConstants.tokenKey, token);
  }

  static Future<String?> getToken() async {
    await init();
    return _prefs?.getString(AppConstants.tokenKey);
  }

  static Future<void> saveUser(UserModel user) async {
    _cachedUser = user;
    await init();
    await _prefs?.setString(AppConstants.userKey, jsonEncode(user.toJson()));
  }

  static UserModel? getCachedUser() {
    if (_cachedUser != null) return _cachedUser;
    final userStr = _prefs?.getString(AppConstants.userKey);
    if (userStr != null) {
      try {
        _cachedUser = UserModel.fromJson(jsonDecode(userStr) as Map<String, dynamic>);
        return _cachedUser;
      } catch (_) {}
    }
    return null;
  }

  static Future<UserModel?> getUser() async {
    await init();
    final userStr = _prefs?.getString(AppConstants.userKey);
    if (userStr != null) {
      try {
        _cachedUser = UserModel.fromJson(jsonDecode(userStr) as Map<String, dynamic>);
        return _cachedUser;
      } catch (_) {}
    }
    return null;
  }

  static Future<void> clearAuth() async {
    _cachedUser = null;
    await init();
    await _prefs?.remove(AppConstants.tokenKey);
    await _prefs?.remove(AppConstants.userKey);
  }

  // Guardar y recuperar borradores de tareas (Heurística de prevención y robustez)
  static Future<void> saveTaskDraft(int tareaId, Map<String, dynamic> draft) async {
    await init();
    await _prefs?.setString('${AppConstants.draftKeyPrefix}$tareaId', jsonEncode(draft));
  }

  static Future<Map<String, dynamic>?> getTaskDraft(int tareaId) async {
    await init();
    final draftStr = _prefs?.getString('${AppConstants.draftKeyPrefix}$tareaId');
    if (draftStr != null) {
      try {
        return jsonDecode(draftStr) as Map<String, dynamic>;
      } catch (_) {}
    }
    return null;
  }

  static Future<void> removeTaskDraft(int tareaId) async {
    await init();
    await _prefs?.remove('${AppConstants.draftKeyPrefix}$tareaId');
  }
}
