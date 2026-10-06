class AppConstants {
  static const String appName = 'FICCT Móvil';
  static const String appSubtitle = 'Investigación & Aulas Moodle';

  // Base URL para conectar con Spring Boot
  // En la Nube (Producción Render): https://ficct-backend.onrender.com/api
  // En dispositivo físico (Wi-Fi local): 192.168.3.42:8080
  // En emulador Android: 10.0.2.2:8080
  // En web o Windows: localhost:8080
  static const String apiBaseUrl = 'https://ficct-backend.onrender.com/api';
  static const String apiBaseUrlCloud = 'https://ficct-backend.onrender.com/api';
  static const String apiBaseUrlWifi = 'http://192.168.3.42:8080/api';
  static const String apiBaseUrlEmulator = 'http://10.0.2.2:8080/api';
  static const String apiBaseUrlWeb = 'http://localhost:8080/api';

  static const String serverUrlKey = 'ficct_server_url';
  static const String tokenKey = 'ficct_auth_token';
  static const String userKey = 'ficct_auth_user';
  static const String draftKeyPrefix = 'ficct_tarea_draft_';
}
