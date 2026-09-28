# FICCT Móvil - Arquitectura Flutter & Guía de Implementación

Este módulo contiene la especificación, diseño y estructura para el desarrollo de la aplicación móvil nativa con **Flutter** de la plataforma de investigación y docencia de la **FICCT UAGRM**.

> 💡 **Prototipo Interactivo en Tiempo Real**: Puedes abrir y probar directamente en cualquier navegador el simulador visual y táctil completo en:
> [`mobile.html`](../mobile.html) (ubicado en la raíz del repositorio).

---

## 📱 1. Características Principales de la Versión Móvil
- **Barra de Navegación Inferior Flotante (Liquid Glass Blur)**:
  - Diseñada con `BackdropFilter` (desenfoque gaussiano de 20px) y translucidez con tintes dinámicos.
  - Indicador elástico activo y micro-animaciones al pulsar pestañas.
- **Cumplimiento de las 10 Heurísticas de Nielsen**:
  1. *Visibilidad del estado*: Indicadores de carga, animaciones de éxito y Toasts reactivos.
  2. *Relación con el mundo real*: Metáforas de Moodle (Aulas, Módulos, Tareas, Entregas, SpeedGrader).
  3. *Control del usuario*: Botón "Deshacer", cancelación de entregas y confirmaciones.
  4. *Consistencia*: Paleta de colores oficial FICCT (`#16243D`, `#1F6F5C`, `#A97C34`).
  5. *Prevención de errores*: Validación de tipos MIME de archivos y bloqueo de campos legales protegidos.
  6. *Reconocimiento antes de recuerdo*: Portadas visuales y previsualización de archivos antes de guardar.
  7. *Flexibilidad y eficiencia*: Acceso rápido a SpeedGrader y entrega en 1 toque.
  8. *Estética minimalista*: Supresión de ruidos visuales innecesarios en pantallas iniciales.
  9. *Diagnóstico de errores*: Mensajes claros y directos ante fallos de conexión o formatos.
  10. *Ayuda contextual*: Avisos informativos de normativas y privacidad Moodle.

---

## 🏗️ 2. Estructura de Paquetes Flutter Recomendada (`lib/`)

```
mobile/
├── android/
├── ios/
├── pubspec.yaml
└── lib/
    ├── main.dart
    ├── config/
    │   ├── theme.dart          # Paleta FICCT, tipografías y Liquid Glass shaders
    │   ├── routes.dart         # Enrutamiento GoRouter con transiciones suaves
    │   └── constants.dart      # URLs base de la API Spring Boot (localhost:8080/api)
    ├── core/
    │   ├── api/
    │   │   ├── api_client.dart # Cliente Dio con interceptor de JWT
    │   │   └── endpoints.dart
    │   └── storage/
    │       └── local_cache.dart# Persistencia de borrador de entrega (SharedPreferences / Hive)
    ├── models/
    │   ├── user_model.dart     # Usuario con fotoPerfil, descripcion, ocultarCursos
    │   ├── convocatoria_model.dart
    │   ├── modulo_model.dart
    │   └── tarea_model.dart
    ├── widgets/
    │   ├── liquid_navbar.dart  # Barra inferior translúcida con BackdropFilter
    │   ├── moodle_card.dart    # Tarjeta de curso estilo aula virtual
    │   ├── mobile_toast.dart   # Notificaciones animadas tipo isla
    │   └── file_dropzone.dart  # Selector de documentos con validación MIME
    └── screens/
        ├── dashboard/
        ├── mis_areas/
        ├── aula_moodle/
        ├── tarea_entrega/
        ├── speedgrader/
        ├── convocatorias/
        ├── perfil/
        └── documentos/
```

---

## 🎨 3. Implementación del Liquid Glass en Flutter

```dart
ClipRRect(
  borderRadius: BorderRadius.circular(26),
  child: BackdropFilter(
    filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
    child: Container(
      height: 66,
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xBE131B2E)
            : const Color(0xB8FFFFFF),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(
          color: Colors.white.withOpacity(0.2),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0x1F16243D),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [...],
      ),
    ),
  ),
)
```
