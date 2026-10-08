import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('[FCM] Notificación en segundo plano: ${message.messageId} - ${message.notification?.title}');
}

class FcmService {
  static String? currentToken;

  /// Inicializa Firebase y FCM listeners
  static Future<void> initialize() async {
    try {
      await Firebase.initializeApp();

      // Configurar handler en segundo plano
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Solicitar permisos de notificación (Android 13+ y iOS)
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      debugPrint('[FCM] Estado de permisos: ${settings.authorizationStatus}');

      // Obtener token FCM inicial
      currentToken = await messaging.getToken();
      debugPrint('[FCM] Token de dispositivo: $currentToken');

      // Si ya hay usuario autenticado, sincronizar token
      if (currentToken != null) {
        await ApiService.actualizarFcmToken(currentToken!);
      }

      // Escuchar cambios de token
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
        currentToken = newToken;
        debugPrint('[FCM] Token actualizado: $newToken');
        await ApiService.actualizarFcmToken(newToken);
      });

      // Escuchar notificaciones en primer plano (foreground)
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[FCM] Notificación en primer plano: ${message.notification?.title} - ${message.notification?.body}');
      });
    } catch (e) {
      debugPrint('[FCM] Error inicializando Firebase Messaging: $e');
    }
  }

  /// Sincroniza el token FCM actual con el backend de Spring Boot
  static Future<void> syncTokenWithBackend() async {
    try {
      currentToken ??= await FirebaseMessaging.instance.getToken();
      if (currentToken != null) {
        await ApiService.actualizarFcmToken(currentToken!);
      }
    } catch (e) {
      debugPrint('[FCM] Error sincronizando token con backend: $e');
    }
  }
}
