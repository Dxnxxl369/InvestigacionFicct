# Contexto del Proyecto: Plataforma de Investigación, Ferias y LMS Académico (FICCT - UAGRM)

> **Documento de Cierre de Sprint 1 y Base de Inicio para Sprint 2**  
> **Facultad Integral del Chaco / FICCT — Universidad Autónoma Gabriel René Moreno**  
> **Fecha:** Septiembre 2026  

---

## 1. Visión General del Proyecto

La **Plataforma de Investigación y Eventos FICCT** es un ecosistema integral diseñado para gestionar tanto convocatorias científicas y formativas (Ferias de Ingeniería, Hackathons, Concursos de Programación, Proyectos de Investigación) como el seguimiento académico riguroso del trabajo de los estudiantes a través de un entorno pedagógico estructurado estilo LMS (Moodle).

### Arquitectura Tecnológica
- **Backend:** Java 17 + Spring Boot 3.x, Spring Data JPA, Spring Security con tokens JWT, Hibernate y base de datos relacional PostgreSQL.
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React Icons.
- **Gestión de Archivos y Medios:** Servicio físico de almacenamiento en servidor (`/api/uploads/imagen`, `/api/uploads/documento`) con filtrado estricto contra ejecutables/scripts (`.exe`, `.bat`, `.cmd`, `.sh`, `.vbs`, etc.) y protección contra *Path Traversal*.
- **Persistencia de Borradores:** Motor en cliente mediante `localStorage` para garantizar cero saturación en base de datos hasta la confirmación definitiva del usuario.

---

## 2. Lo que se ha realizado (Sprint 1 Completado)

Durante el **Sprint 1** se desarrollaron y consolidaron los pilares fundamentales del sistema:

### A. Gestión de Convocatorias y Áreas de Aprendizaje
- Creación, edición y publicación de convocatorias por tipo:
  - **FERIA** (ej. Feria de Ingeniería y Ciencia).
  - **HACKATHON** (ej. Hackathon de Innovación FICCT).
  - **CONCURSO** (ej. Concurso de Algoritmia y Programación Competitiva).
  - **INVESTIGACION** (Proyectos de grado e iniciativas de investigación).
- Carga de portada con soporte dual: URL externa o archivo de imagen local con arrastrar y soltar (Drag & Drop), previsualización en vivo y respaldo en borrador local.
- Asignación flexible de responsables:
  - **Docentes a cargo:** Responsables pedagógicos del área.
  - **Jurados evaluadores:** Asignables en cualquier momento (incluso hasta el día de la clausura).

### B. Sistema de Admisiones e Inscripciones ("Mis Áreas")
- Los estudiantes pueden postularse libremente a convocatorias abiertas (de forma individual o con nombre de equipo).
- Estado de solicitud: `PENDIENTE`, `ACEPTADO`, `RECHAZADO`, `CANCELADO`.
- **Control para el estudiante:** Puede declinar su postulación en cualquier momento mientras esté pendiente.
- **Control para el docente/admin:** Modal para admitir o rechazar solicitudes con motivo de rechazo explícito.
- **Privacidad y orden:**
  - Los estudiantes **no admitidos** solo tienen acceso a la ficha general y requisitos de la convocatoria.
  - Los estudiantes **admitidos** acceden al aula virtual completa ("Mis Áreas"), visualizan participantes aceptados, docentes, módulos y tareas.

### C. Módulos Temáticos de Aprendizaje (LMS / Moodle Style)
- Organización modular del contenido académico:
  - Vista general en cuadrícula (Cards con portada, orden, total de tareas adscritas y descripciones).
  - Vista enfocada y detallada de módulo (`Subvista 1.B`) para eliminar el ruido visual.
  - CRUD completo de módulos con selector de orden y carga de imagen de portada (con Drag & Drop y borrador en `localStorage`).
  - Soporte de tareas tanto dentro de módulos específicos como tareas transversales/generales.

### D. Tareas Académicas con Triple Control de Fechas (Moodle)
Cada tarea cuenta con el control de disponibilidad más exigente del estándar Moodle:
1. **Fecha de Habilitación / Apertura:** Momento exacto a partir del cual el estudiante puede empezar a subir entregas.
2. **Fecha de Entrega (Límite Regular):** Fecha límite formal; entregas posteriores se marcan automáticamente como `ENTREGA_CON_RETRASO`.
3. **Fecha de Corte (Cierre Definitivo):** Límite estricto tras el cual el sistema bloquea y prohíbe cualquier nuevo envío o reenvío.
- Conmutador en vivo para habilitar o suspender entregas manualmente con un solo clic (`toggleHabilitar`).

### E. Entregas de Estudiantes: Drag & Drop, Validación y "Guardar Como"
- **Validaciones Inmediatas:**
  - Control de extensiones permitidas configuradas en la tarea (ej. `.pdf, .docx, .zip`). Rechazo visual inmediato de formatos no autorizados.
  - Control de peso máximo en MB (`tamanoMaximoMb`, ej. 15 MB) con retroalimentación clara.
- **Zona Drag & Drop Interactiva:** Dropzone con estados visuales activos para arrastrar desde el explorador del sistema operativo o hacer clic para explorar.
- **Renombramiento al estilo Moodle ("Guardar como"):** Permite al estudiante renombrar cómo se registrará formalmente su archivo en la plataforma sin alterar el archivo original y preservando la extensión correspondiente.
- **Persistencia en LocalStorage:** El archivo, los comentarios y los metadatos se guardan automáticamente en borrador en el navegador. Si el estudiante recarga o cierra el modal, al volver a entrar se restaura su borrador intacto y dispone de un botón para descartarlo.
- **Subida física real:** Al enviar, el documento se transfiere físicamente a `/api/uploads/documento` y se almacena en el servidor, vinculándose a la entrega del estudiante.
- Opción de vincular documentos previos del repositorio de investigación de la FICCT.

### F. Consola de Calificación SpeedGrader (Pantalla Completa)
- Consola dedicada para docentes y jurados inspirada en Canvas LMS y Moodle:
  - Panel lateral izquierdo con listado de participantes, buscador en vivo y filtros por estado (`TODOS`, `PENDIENTES`, `CALIFICADOS`, `SIN_ENTREGA`).
  - Panel central con visor de detalles del estudiante, fecha exacta de entrega, documento de investigación vinculado y botón para **Ver / Descargar** el archivo físico entregado.
  - Panel lateral derecho para asignación de nota numérica (sobre el puntaje máximo configurado) y retroalimentación cualitativa.
  - Guardado instantáneo con actualización reactiva de estados.

---

## 3. Matriz de Roles y Permisos Actual

| Funcionalidad / Módulo | Administrador | Docente Encargado | Jurado Evaluador | Estudiante Admitido | Estudiante No Admitido |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Crear / Editar Convocatoria** | ✅ Total | ❌ | ❌ | ❌ | ❌ |
| **Designar Docentes y Jurados** | ✅ Sí | ✅ (Jurados) | ❌ | ❌ | ❌ |
| **Crear / Modificar Módulos** | ✅ Sí | ✅ En su área | ❌ | ❌ | ❌ |
| **Crear Tareas (Triple Fecha)** | ✅ Sí | ✅ En su área | ❌ | ❌ | ❌ |
| **Admitir / Rechazar Solicitudes** | ✅ Sí | ✅ En su área | ❌ | ❌ | ❌ |
| **Ver Participantes y Contenido** | ✅ Sí | ✅ En su área | ✅ Solo lectura | ✅ Sí | ❌ (Solo ficha pública) |
| **Subir / Modificar Entregas** | ❌ | ❌ | ❌ | ✅ Sí (con Drag & Drop) | ❌ |
| **SpeedGrader (Calificar / Feedback)** | ✅ Sí | ✅ En su área | ✅ Proyectos asignados | ❌ | ❌ |
| **Ver Notas y Retroalimentación** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sus notas propias | ❌ |

---

## 4. Usuarios de Prueba Preconfigurados (DataSeeder)

El sistema inicializa automáticamente la base de datos con los siguientes perfiles funcionales:

| Rol | Correo Electrónico | Contraseña | Nombre Completo |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@uagrm.edu.bo` | `admin369` | Administrador Investigación |
| **DOCENTE** | `rmartinez@uagrm.edu.bo` | `docente123` | Rolando Martínez Canedo |
| **JURADO** | `jurado1@uagrm.edu.bo` | `jurado123` | Lic. Evaluador Jurado 1 |
| **ESTUDIANTE** | `daniel.quispe@uagrm.edu.bo` | `estudiante123` | Daniel Quispe Choque |

---

## 5. Nuevas Funcionalidades Entregadas (Inicio de Sprint 2)

### A. Sidebar Colapsable y Desplegable Dinámico (Web Dashboard)
- **Modos de Visualización:**
  - **Modo Expandido (`w-64`):** Logotipo completo de la facultad, títulos de módulos, badges distintivos (*"Colaborativo"*, *"Moodle"*) y tarjeta de usuario completa.
  - **Modo Colapsado (`w-[76px]`):** Iconos centrados ergonómicos con tooltips flotantes instantáneos en `hover`, indicador de notificaciones y avatar compacto con enlace directo al perfil.
- **Control Lateral:** Botón toggle interactivo con iconos `PanelLeftClose` y `PanelLeftOpen`.
- **Persistencia:** Almacenamiento del estado en `localStorage` (`sidebar_collapsed`), preservando la preferencia del usuario entre sesiones y rutas.

### B. Módulo de Perfil Académico & Privacidad Moodle (`/dashboard/perfil`)
- **Datos Personales Editables:**
  - **Foto de Perfil:** Carga directa de imágenes locales (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` hasta 5 MB) conectada al endpoint de subida, con previsualización en tiempo real y soporte para URLs externas.
  - **Biografía / Presentación Personal:** Campo de texto de hasta 500 caracteres con contador en vivo para líneas de investigación y especialidad académica.
- **Datos Legales e Institucionales Protegidos (Solo Lectura):**
  - Nombre completo, correo electrónico institucional, rol y estado de cuenta bloqueados estrictamente con candado visual (`Lock`) y validación en backend (`PerfilUpdateRequest`).
- **Control de Privacidad de Cursos (Estilo Moodle):**
  - Interruptor `ocultarCursos`: permite a docentes y estudiantes ocultar su participación en materias ante terceros, haciéndolos visibles únicamente para sí mismos y administradores.
- **Listado de Cursos del Usuario:**
  - Detección inteligente del rol específico en cada asignatura (Docente Encargado, Jurado Evaluador, Estudiante Inscrito o Coordinador).
  - Buscador textual y filtros rápidos por rol.

### C. Plataforma Móvil & Ecosistema Flutter (`mobile/` y `mobile.html`)
- **Prototipo Interactivo en Tiempo Real (`mobile.html`):**
  - Marco realista de smartphone con Dynamic Island, reloj en vivo, barra de estado y gestos.
  - **Barra de Navegación Inferior Flotante (Liquid Glass Blur):** Diseñada con desenfoque gaussiano de 24px (`BackdropFilter`) y translucidez dinámica.
  - **10 Pantallas Replicadas:** Dashboard, Mis Áreas Moodle, Aula Virtual, Tarea Drag & Drop, SpeedGrader, Convocatorias, Detalle de Feria, Nueva Convocatoria, Perfil Académico y Documentos IA.
  - **Heurísticas de Nielsen:** Cumplimiento explícito en cada pantalla con panel de control interactivo para conmutar roles en 1 clic.
- **Aplicación Nativa Flutter (`mobile/`):**
  - Proyecto completo en Dart/Flutter con arquitectura limpia (`config`, `models`, `services`, `widgets`, `screens`).
  - Servicios HTTP y persistencia en `SharedPreferences` para borradores de tareas offline.
  - Verificado con `flutter analyze` (0 errores) y `flutter test` (100% aprobado).

---

## 6. Hoja de Ruta Continua para el Sprint 2

Con los cimientos móviles y de gestión de perfiles listos, se identifican las siguientes prioridades funcionales:

1. **Matriz de Rúbricas de Evaluación Multicriterio:**
   - Creación de rúbricas analíticas estructuradas (Criterios, Niveles de Desempeño y Ponderación porcentual o numérica).
   - Integración directa en la consola SpeedGrader web y móvil para evaluación por rúbrica con un solo clic.

2. **Gestión Avanzada de Equipos y Co-evaluación:**
   - Formación formal de grupos con límite de cupos (`cuposMinEquipo`, `cuposMaxEquipo`).
   - Envío grupal de tareas (la entrega de un integrante aplica para todo el equipo).
   - Módulo opcional de co-evaluación interna entre compañeros de equipo.

3. **Notificaciones en Tiempo Real (WebSockets / STOMP):**
   - Avisos instantáneos cuando un docente publica una tarea o un módulo.
   - Notificación al estudiante cuando su solicitud es admitida o rechazada.
   - Notificación instantánea al ser calificado en SpeedGrader.

4. **Certificaciones Digitales con Validación QR:**
   - Generación de certificados digitales en PDF con código QR y token criptográfico de autenticidad para participantes, ganadores, docentes y jurados.

5. **Galería Pública y Vitrina de Proyectos Finalizados:**
   - Al concluir la convocatoria, habilitar un escaparate público de proyectos destacados, actas de premiación y memorias de investigación de la facultad.

---

*Proyecto desarrollado para la Facultad Integral del Chaco y la Facultad de Ciencias de la Computación y Telecomunicaciones (FICCT - UAGRM).*
