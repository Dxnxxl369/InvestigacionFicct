package com.ficct.investigacion.init;

import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final RolPermisoRepository rolPermisoRepository;
    private final PasswordEncoder passwordEncoder;
    private final DocumentoRepository documentoRepository;
    private final DocumentoColaboradorRepository documentoColaboradorRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final TareaRepository tareaRepository;
    private final EntregaTareaRepository entregaTareaRepository;

    public DataSeeder(UserRepository userRepository,
                      ConvocatoriaRepository convocatoriaRepository,
                      RolPermisoRepository rolPermisoRepository,
                      PasswordEncoder passwordEncoder,
                      DocumentoRepository documentoRepository,
                      DocumentoColaboradorRepository documentoColaboradorRepository,
                      ConvocatoriaParticipanteRepository participanteRepository,
                      TareaRepository tareaRepository,
                      EntregaTareaRepository entregaTareaRepository) {
        this.userRepository = userRepository;
        this.convocatoriaRepository = convocatoriaRepository;
        this.rolPermisoRepository = rolPermisoRepository;
        this.passwordEncoder = passwordEncoder;
        this.documentoRepository = documentoRepository;
        this.documentoColaboradorRepository = documentoColaboradorRepository;
        this.participanteRepository = participanteRepository;
        this.tareaRepository = tareaRepository;
        this.entregaTareaRepository = entregaTareaRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Sembrar Usuarios Iniciales
        if (!userRepository.existsByEmail("admin@uagrm.edu.bo")) {
            User admin = new User(
                    "Administrador",
                    "Investigación",
                    "admin@uagrm.edu.bo",
                    passwordEncoder.encode("admin369"),
                    Rol.ADMIN,
                    EstadoUsuario.ACTIVO
            );
            userRepository.save(admin);
            System.out.println(">> [DataSeeder] Usuario Administrador creado: admin@uagrm.edu.bo / admin369");
        }

        if (!userRepository.existsByEmail("rmartinez@uagrm.edu.bo")) {
            User docente = new User(
                    "Rolando",
                    "Martínez Canedo",
                    "rmartinez@uagrm.edu.bo",
                    passwordEncoder.encode("docente123"),
                    Rol.DOCENTE,
                    EstadoUsuario.ACTIVO
            );
            userRepository.save(docente);
            System.out.println(">> [DataSeeder] Usuario Docente creado: rmartinez@uagrm.edu.bo / docente123");
        }

        if (!userRepository.existsByEmail("cfernandez@uagrm.edu.bo")) {
            User jurado = new User(
                    "Carlos",
                    "Fernández",
                    "cfernandez@uagrm.edu.bo",
                    passwordEncoder.encode("jurado123"),
                    Rol.JURADO,
                    EstadoUsuario.ACTIVO
            );
            userRepository.save(jurado);
            System.out.println(">> [DataSeeder] Usuario Jurado creado: cfernandez@uagrm.edu.bo / jurado123");
        }

        User daniel = null;
        if (!userRepository.existsByEmail("daniel.quispe@uagrm.edu.bo")) {
            daniel = new User(
                    "Daniel",
                    "Quispe Choque",
                    "daniel.quispe@uagrm.edu.bo",
                    passwordEncoder.encode("estudiante123"),
                    Rol.ESTUDIANTE,
                    EstadoUsuario.ACTIVO
            );
            daniel = userRepository.save(daniel);
            System.out.println(">> [DataSeeder] Estudiante creado: daniel.quispe@uagrm.edu.bo / estudiante123");
        } else {
            daniel = userRepository.findByEmail("daniel.quispe@uagrm.edu.bo").orElse(null);
        }

        // Sembrar alias de Daniel para login rápido con dquispe@uagrm.edu.bo
        if (!userRepository.existsByEmail("dquispe@uagrm.edu.bo")) {
            User dquispe = new User(
                    "Daniel",
                    "Quispe",
                    "dquispe@uagrm.edu.bo",
                    passwordEncoder.encode("estudiante123"),
                    Rol.ESTUDIANTE,
                    EstadoUsuario.ACTIVO
            );
            userRepository.save(dquispe);
            System.out.println(">> [DataSeeder] Estudiante alias creado: dquispe@uagrm.edu.bo / estudiante123");
        }

        // Sembrar estudiante genérico para pruebas inmediatas
        if (!userRepository.existsByEmail("estudiante@uagrm.edu.bo")) {
            User estGen = new User(
                    "Estudiante",
                    "Prueba",
                    "estudiante@uagrm.edu.bo",
                    passwordEncoder.encode("estudiante123"),
                    Rol.ESTUDIANTE,
                    EstadoUsuario.ACTIVO
            );
            userRepository.save(estGen);
            System.out.println(">> [DataSeeder] Estudiante genérico creado: estudiante@uagrm.edu.bo / estudiante123");
        }

        if (!userRepository.existsByEmail("brandon.vasquez@uagrm.edu.bo")) {
            User brandon = new User(
                    "Brandon",
                    "Vásquez",
                    "brandon.vasquez@uagrm.edu.bo",
                    passwordEncoder.encode("estudiante123"),
                    Rol.ESTUDIANTE,
                    EstadoUsuario.ACTIVO
            );
            userRepository.save(brandon);
            System.out.println(">> [DataSeeder] Estudiante creado: brandon.vasquez@uagrm.edu.bo / estudiante123");
        }

        // 2. Sembrar Convocatorias Iniciales
        if (convocatoriaRepository.count() == 0) {
            User creador = userRepository.findByEmail("admin@uagrm.edu.bo").orElse(daniel);

            Convocatoria c1 = new Convocatoria(
                    "Feria de Ingeniería 2026",
                    "Exposición anual de proyectos estudiantiles de todas las carreras de la facultad de ingeniería.",
                    TipoConvocatoria.FERIA,
                    EstadoConvocatoria.PUBLICADA,
                    LocalDate.of(2026, 10, 30),
                    "Hasta 4 integrantes",
                    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
                    creador
            );
            c1.addRequisito(new Requisito("Estudiante regular de la FICCT", c1));
            c1.addRequisito(new Requisito("Promedio acumulado ≥ 70", c1));
            c1.addRequisito(new Requisito("Carta de aval del docente guía", c1));
            convocatoriaRepository.save(c1);

            Convocatoria c2 = new Convocatoria(
                    "Hackathon FICCT 2026",
                    "48 horas continuas para construir una solución de software innovadora sobre un problema real de la región cruceña.",
                    TipoConvocatoria.HACKATHON,
                    EstadoConvocatoria.PUBLICADA,
                    LocalDate.of(2026, 11, 12),
                    "Individual o equipo",
                    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
                    creador
            );
            c2.addRequisito(new Requisito("Inscripción de equipo previa", c2));
            c2.addRequisito(new Requisito("Disponibilidad completa durante el fin de semana", c2));
            convocatoriaRepository.save(c2);

            Convocatoria c3 = new Convocatoria(
                    "Convocatoria de Investigación Aplicada",
                    "Postulación abierta para proyectos de investigación aplicada y desarrollo tecnológico de la Unidad de Investigación.",
                    TipoConvocatoria.INVESTIGACION,
                    EstadoConvocatoria.PUBLICADA,
                    LocalDate.of(2026, 12, 8),
                    "Individual o dupla",
                    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
                    creador
            );
            c3.addRequisito(new Requisito("Perfil de tesis o investigación preliminar", c3));
            c3.addRequisito(new Requisito("Tutor de investigación acreditado", c3));
            convocatoriaRepository.save(c3);

            Convocatoria c4 = new Convocatoria(
                    "Concurso de Algoritmia y Estructuras de Datos",
                    "Competencia de programación competitiva individual para medir destrezas de optimización y complejidad algorítmica.",
                    TipoConvocatoria.CONCURSO,
                    EstadoConvocatoria.BORRADOR,
                    LocalDate.of(2026, 10, 15),
                    "Individual",
                    null,
                    creador
            );
            c4.addRequisito(new Requisito("Cursos de Algoritmos I o II cursados", c4));
            convocatoriaRepository.save(c4);

            System.out.println(">> [DataSeeder] Convocatorias de prueba creadas exitosamente.");
        }

        // 3. Sembrar Permisos por Rol y Módulo (RBAC granular)
        seedPermisos();

        // 4. Sembrar Documentos y Permisos Colaborativos (Sprint 2)
        seedDocumentos();

        // 5. Sembrar Participantes y Tareas tipo Moodle en Áreas/Convocatorias (Sprint 2)
        seedParticipantesYTareasEnAreas();
    }

    private void seedDocumentos() {
        if (documentoRepository.count() == 0) {
            User daniel = userRepository.findByEmail("daniel.quispe@uagrm.edu.bo").orElse(null);
            User brandon = userRepository.findByEmail("brandon.vasquez@uagrm.edu.bo").orElse(null);
            User docente = userRepository.findByEmail("rmartinez@uagrm.edu.bo").orElse(null);

            if (daniel != null) {
                // Documento 1: Tesis de Grado
                Documento doc1 = new Documento(
                        "Plataforma de Investigacion FICCT - Tesis de Grado",
                        "Diseno y construccion de una plataforma integral para la gestion de proyectos y ferias cientificas de la FICCT.",
                        "TESIS",
                        "1. INTRODUCCION\nEl presente trabajo aborda la necesidad de digitalizar y centralizar los procesos de investigacion estudiantil en la Facultad Integral del Chaco y la FICCT...\n\n2. METODOLOGIA\nSe emplea Scrum adaptado a 3 semanas por iteracion con estandares IEEE 830 para especificacion de requisitos.",
                        daniel,
                        null
                );
                doc1.setEstado(EstadoDocumento.BORRADOR);
                doc1 = documentoRepository.save(doc1);

                // Asignar colaboradores: Brandon con EDICION (co-autor en feria/hackaton/tesis), Docente con LECTURA
                if (brandon != null) {
                    DocumentoColaborador colabBrandon = new DocumentoColaborador(doc1, brandon, TipoPermisoDoc.EDICION);
                    documentoColaboradorRepository.save(colabBrandon);
                }
                if (docente != null) {
                    DocumentoColaborador colabDocente = new DocumentoColaborador(doc1, docente, TipoPermisoDoc.LECTURA);
                    documentoColaboradorRepository.save(colabDocente);
                }

                // Documento 2: Proyecto de Hackathon
                Convocatoria hackathon = convocatoriaRepository.findAll().stream()
                        .filter(c -> c.getTipo() == TipoConvocatoria.HACKATHON)
                        .findFirst().orElse(null);

                Documento doc2 = new Documento(
                        "Monitoreo Inteligente de Calidad del Agua - Hackathon 2026",
                        "Prototipo IoT y vision artificial para la medicion de contaminantes en cuencas hidrograficas de Santa Cruz.",
                        "HACKATHON",
                        "1. RESUMEN EJECUTIVO\nSolucion integral con sensores de pH y turbidez acoplados a microcontroladores ESP32 y transmision LoRaWAN...\n\n2. ARQUITECTURA\nGateway central y procesamiento en la nube con alertas tempranas en Next.js.",
                        daniel,
                        hackathon
                );
                doc2.setEstado(EstadoDocumento.BORRADOR);
                doc2 = documentoRepository.save(doc2);

                // Asignar a Brandon con ADMINISTRACION en el proyecto de hackathon
                if (brandon != null) {
                    DocumentoColaborador colabHack = new DocumentoColaborador(doc2, brandon, TipoPermisoDoc.ADMINISTRACION);
                    documentoColaboradorRepository.save(colabHack);
                }

                System.out.println(">> [DataSeeder] Documentos colaborativos de prueba creados exitosamente.");
            }
        }
    }

    private void seedParticipantesYTareasEnAreas() {
        if (participanteRepository.count() == 0) {
            User admin = userRepository.findByEmail("admin@uagrm.edu.bo").orElse(null);
            User docente = userRepository.findByEmail("rmartinez@uagrm.edu.bo").orElse(null);
            User jurado = userRepository.findByEmail("cfernandez@uagrm.edu.bo").orElse(null);
            User daniel = userRepository.findByEmail("daniel.quispe@uagrm.edu.bo").orElse(null);
            User brandon = userRepository.findByEmail("brandon.vasquez@uagrm.edu.bo").orElse(null);

            Convocatoria feria = convocatoriaRepository.findAll().stream()
                    .filter(c -> c.getTitulo().toLowerCase().contains("feria"))
                    .findFirst().orElse(null);

            Convocatoria hackathon = convocatoriaRepository.findAll().stream()
                    .filter(c -> c.getTitulo().toLowerCase().contains("hackathon"))
                    .findFirst().orElse(null);

            if (feria != null) {
                // Designar Docente y Jurado en la Feria
                if (docente != null) {
                    participanteRepository.save(new ConvocatoriaParticipante(feria, docente, Rol.DOCENTE, null, admin));
                }
                if (jurado != null) {
                    participanteRepository.save(new ConvocatoriaParticipante(feria, jurado, Rol.JURADO, null, admin));
                }
                // Inscribir Estudiantes con su Equipo en la Feria
                if (daniel != null) {
                    participanteRepository.save(new ConvocatoriaParticipante(feria, daniel, Rol.ESTUDIANTE, "Equipo ByteWarriors", daniel));
                }
                if (brandon != null) {
                    participanteRepository.save(new ConvocatoriaParticipante(feria, brandon, Rol.ESTUDIANTE, "Equipo ByteWarriors", brandon));
                }

                // Tarea 1: Perfil de Proyecto y Marco Metodológico (Habilitada y abierta)
                Tarea tarea1 = new Tarea(
                        feria,
                        "Entrega 1: Perfil de Proyecto y Marco Metodologico",
                        "Subir el borrador del perfil en formato PDF o Word, incluyendo objetivos generales, especificos y cronograma de actividades.",
                        java.time.LocalDateTime.now().minusDays(2), // Habilitada hace 2 días
                        java.time.LocalDateTime.now().plusDays(8),  // Entrega regular
                        java.time.LocalDateTime.now().plusDays(12), // Corte estricto
                        true,
                        ".pdf, .docx, .zip",
                        15,
                        100.0,
                        docente
                );
                tarea1 = tareaRepository.save(tarea1);

                // Sembrar entrega previa de Daniel en la Feria
                if (daniel != null) {
                    Documento docDaniel = documentoRepository.findByAutorOrderByUpdatedAtDesc(daniel).stream()
                            .findFirst().orElse(null);

                    EntregaTarea entrega = new EntregaTarea(
                            tarea1,
                            daniel,
                            docDaniel,
                            "Perfil_Investigacion_Quispe.pdf",
                            "/archivos/entregas/Perfil_Investigacion_Quispe.pdf",
                            "Estimado docente, adjunto el avance formal con el marco metodologico revisado."
                    );
                    entregaTareaRepository.save(entrega);
                }

                // Tarea 2: Avance Capítulo 2 (Deshabilitada temporalmente para probar toggle)
                Tarea tarea2 = new Tarea(
                        feria,
                        "Entrega 2: Avance del Capitulo 2 (Diagramas Sparx EA y Clases)",
                        "Entrega del diseno arquitectonico y modelado de datos en formato PDF.",
                        java.time.LocalDateTime.now().plusDays(5),
                        java.time.LocalDateTime.now().plusDays(20),
                        java.time.LocalDateTime.now().plusDays(25),
                        false, // Deshabilitada manualmente como en Moodle
                        ".pdf",
                        10,
                        100.0,
                        docente
                );
                tareaRepository.save(tarea2);
            }

            if (hackathon != null) {
                if (docente != null) {
                    participanteRepository.save(new ConvocatoriaParticipante(hackathon, docente, Rol.DOCENTE, null, admin));
                }
                if (daniel != null) {
                    participanteRepository.save(new ConvocatoriaParticipante(hackathon, daniel, Rol.ESTUDIANTE, "HackDevelopers", daniel));
                }

                Tarea tareaHack = new Tarea(
                        hackathon,
                        "Fase 1: Propuesta Tecnica y Repositorio Git",
                        "Subir enlace al repositorio y resumen ejecutivo de la arquitectura Cloud.",
                        java.time.LocalDateTime.now().minusDays(1),
                        java.time.LocalDateTime.now().plusDays(3),
                        java.time.LocalDateTime.now().plusDays(4),
                        true,
                        ".zip, .pdf",
                        20,
                        100.0,
                        docente
                );
                tareaRepository.save(tareaHack);
            }

            System.out.println(">> [DataSeeder] Participantes (Docentes, Jurados, Estudiantes) y Tareas Moodle sembrados exitosamente.");
        }
    }

    private void seedPermisos() {
        String[] modulos = {"CONVOCATORIAS", "USUARIOS", "DOCUMENTOS", "CERTIFICADOS"};

        for (Rol rol : Rol.values()) {
            for (String mod : modulos) {
                if (!rolPermisoRepository.existsByRolAndModulo(rol, mod)) {
                    boolean puedeVer = false;
                    boolean puedeEditar = false;

                    switch (rol) {
                        case ADMIN:
                            puedeVer = true;
                            puedeEditar = true;
                            break;
                        case DOCENTE:
                            if ("CONVOCATORIAS".equals(mod) || "DOCUMENTOS".equals(mod)) {
                                puedeVer = true;
                                puedeEditar = true;
                            } else if ("CERTIFICADOS".equals(mod)) {
                                puedeVer = true;
                                puedeEditar = false;
                            }
                            break;
                        case JURADO:
                            if ("CONVOCATORIAS".equals(mod)) {
                                puedeVer = true;
                                puedeEditar = false;
                            } else if ("DOCUMENTOS".equals(mod) || "CERTIFICADOS".equals(mod)) {
                                puedeVer = true;
                                puedeEditar = true;
                            }
                            break;
                        case ESTUDIANTE:
                            if ("CONVOCATORIAS".equals(mod) || "CERTIFICADOS".equals(mod)) {
                                puedeVer = true;
                                puedeEditar = false;
                            } else if ("DOCUMENTOS".equals(mod)) {
                                puedeVer = true;
                                puedeEditar = true;
                            }
                            break;
                    }

                    rolPermisoRepository.save(new RolPermiso(rol, mod, puedeVer, puedeEditar));
                }
            }
        }
        System.out.println(">> [DataSeeder] Matriz de permisos RBAC sembrada exitosamente.");
    }
}
