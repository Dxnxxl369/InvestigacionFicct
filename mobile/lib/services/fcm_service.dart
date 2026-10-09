import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'api_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('[FCM Background] Notificación recibida: ${message.messageId} | ${message.notification?.title}');
}

class FcmService {
  static String? currentToken;
  static final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'ficct_notificaciones_channel',
    'Notificaciones FICCT',
    description: 'Canal principal de avisos de entregas, tareas y calificaciones de la facultad',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );

  /// Callback opcional para cuando el usuario toca una notificación
  static void Function(Map<String, dynamic> data)? onNotificationTapped;

  /// Inicializa Firebase, FCM y el plugin de notificaciones locales (heads-up banner)
  static Future<void> initialize() async {
    try {
      await Firebase.initializeApp();

      // Handler en segundo plano
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Inicializar notificaciones locales para mostrar banners en primer plano
      const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      const initSettings = InitializationSettings(android: androidInit);

      await _localNotifications.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          debugPrint('[FCM Local] Toque en notificación local: ${response.payload}');
          if (response.payload != null && response.payload!.isNotEmpty) {
            try {
              final data = jsonDecode(response.payload!) as Map<String, dynamic>;
              onNotificationTapped?.call(data);
            } catch (_) {}
          }
        },
      );

      // Crear canal de notificación de alta importancia en Android
      final androidPlatform = _localNotifications.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlatform != null) {
        await androidPlatform.createNotificationChannel(_channel);
        // Permiso Android 13+ (Tiramisu)
        await androidPlatform.requestNotificationsPermission();
      }

      // Permisos FCM para iOS y Android
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
        criticalAlert: false,
      );
      debugPrint('[FCM] Estado de permisos otorgados: ${settings.authorizationStatus}');

      // Permitir banners cuando la app está activa (foreground)
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // Obtener token FCM inicial
      currentToken = await messaging.getToken();
      debugPrint('[FCM] Token de dispositivo inicial: $currentToken');

      // Si ya hay sesión abierta, registrar de inmediato
      if (currentToken != null) {
        await syncTokenWithBackend();
      }

      // Escuchar rotación o actualización del token
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
        currentToken = newToken;
        debugPrint('[FCM] Token refrescado: $newToken');
        await syncTokenWithBackend();
      });

      // Escuchar notificaciones en PRIMER PLANO (foreground)
      // Disparamos banner heads-up visual en la barra superior del sistema
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[FCM Foreground] Mensaje recibido: ${message.notification?.title} - ${message.notification?.body}');

        final notification = message.notification;
        if (notification != null) {
          final title = notification.title ?? 'Notificación FICCT';
          final body = notification.body ?? '';

          _localNotifications.show(
            id: message.hashCode,
            title: title,
            body: body,
            notificationDetails: NotificationDetails(
              android: AndroidNotificationDetails(
                _channel.id,
                _channel.name,
                channelDescription: _channel.description,
                icon: '@mipmap/ic_launcher',
                importance: Importance.max,
                priority: Priority.high,
                playSound: true,
                enableVibration: true,
                styleInformation: BigTextStyleInformation(body),
              ),
            ),
            payload: jsonEncode(message.data),
          );
        }
      });

      // Notificación tocada en segundo plano
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[FCM OpenedApp] Notificación abierta desde background: ${message.data}');
        onNotificationTapped?.call(message.data);
      });

      // Notificación que abrió la app desde estado terminada (cold start)
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('[FCM InitialMessage] App abierta desde notificación terminada: ${initialMessage.data}');
        Future.delayed(const Duration(milliseconds: 1000), () {
          onNotificationTapped?.call(initialMessage.data);
        });
      }
    } catch (e) {
      debugPrint('[FCM] Error inicializando Firebase Messaging: $e');
    }
  }

  /// Sincroniza el token FCM actual con el backend de Spring Boot (con reintentos)
  static Future<void> syncTokenWithBackend({int reintentos = 2}) async {
    try {
      currentToken ??= await FirebaseMessaging.instance.getToken();
      if (currentToken == null || currentToken!.isEmpty) {
        debugPrint('[FCM] No hay token disponible para sincronizar con el backend.');
        return;
      }

      bool exito = await ApiService.actualizarFcmToken(currentToken!);
      if (exito) {
        debugPrint('[FCM] Token sincronizado exitosamente con el backend.');
        return;
      }

      // Si falló (ej. auth no listo todavía o conexión lenta), reintentar brevemente
      for (int i = 1; i <= reintentos; i++) {
        await Future.delayed(Duration(seconds: i * 2));
        debugPrint('[FCM] Reintentando registrar token con el backend (intento $i)...');
        exito = await ApiService.actualizarFcmToken(currentToken!);
        if (exito) {
          debugPrint('[FCM] Token sincronizado con éxito en intento $i.');
          return;
        }
      }
    } catch (e) {
      debugPrint('[FCM] Error sincronizando token con backend: $e');
    }
  }
}
