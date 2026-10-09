package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class TareaService {

    public static final ZoneId ZONA_FICCT = ZoneId.of("America/La_Paz");

    private final TareaRepository tareaRepository;
    private final EntregaTareaRepository entregaRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final DocumentoRepository documentoRepository;
    private final UserRepository userRepository;
    private final ModuloRepository moduloRepository;
    private final ActividadGrupoRepository actividadGrupoRepository;
    private final RubricaCriterioRepository rubricaCriterioRepository;
    private final EntregaVersionRepository entregaVersionRepository;
    private final EntregaPuntajeCriterioRepository puntajeCriterioRepository;
    private final NotificacionService notificacionService;
    private final ConvocatoriaService convocatoriaService;

    public TareaService(TareaRepository tareaRepository,
                        EntregaTareaRepository entregaRepository,
                        ConvocatoriaRepository convocatoriaRepository,
                        ConvocatoriaParticipanteRepository participanteRepository,
                        DocumentoRepository documentoRepository,
                        UserRepository userRepository,
                        ModuloRepository moduloRepository,
                        ActividadGrupoRepository actividadGrupoRepository,
                        RubricaCriterioRepository rubricaCriterioRepository,
                        EntregaVersionRepository entregaVersionRepository,
                        EntregaPuntajeCriterioRepository puntajeCriterioRepository,
                        @Lazy NotificacionService notificacionService,
                        @Lazy ConvocatoriaService convocatoriaService) {
        this.tareaRepository = tareaRepository;
        this.entregaRepository = entregaRepository;
        this.convocatoriaRepository = convocatoriaRepository;
        this.participanteRepository = participanteRepository;
        this.documentoRepository = documentoRepository;
        this.userRepository = userRepository;
        this.moduloRepository = moduloRepository;
        this.actividadGrupoRepository = actividadGrupoRepository;
        this.rubricaCriterioRepository = rubricaCriterioRepository;
        this.entregaVersionRepository = entregaVersionRepository;
        this.puntajeCriterioRepository = puntajeCriterioRepository;
        this.notificacionService = notificacionService;
        this.convocatoriaService = convocatoriaService;
    }

    private boolean puedeDocenteGestionarTarea(Convocatoria convocatoria, User user) {
        if (user.getRol() == Rol.ADMIN) {
            return true;
        }
        if (user.getRol() == Rol.DOCENTE) {
            if (convocatoria.getCreador() != null && convocatoria.getCreador().getId().equals(user.getId())) {
                return true;
            }
            return participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRolAndEstadoInscripcion(
                    convocatoria.getId(), user.getId(), Rol.DOCENTE, EstadoInscripcion.ACEPTADO);
        }
        return false;
    }

    public TareaDTO crearTarea(Long convocatoriaId, TareaRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + convocatoriaId));

        if (!puedeDocenteGestionarTarea(convocatoria, user)) {
            throw new AccessDeniedException("Solo un Docente asignado a esta área o un Administrador puede crear tareas.");
        }

        LocalDateTime fechaHab = request.getFechaHabilitacion() != null ? request.getFechaHabilitacion() : LocalDateTime.now(ZONA_FICCT);
        LocalDateTime fechaEnt = request.getFechaEntrega() != null ? request.getFechaEntrega() : request.getFechaLimite();
        LocalDateTime fechaCor = request.getFechaCorte() != null ? request.getFechaCorte() : fechaEnt;

        Tarea tarea = new Tarea(
                convocatoria,
                request.getTitulo(),
                request.getDescripcion(),
                fechaHab,
                fechaEnt,
                fechaCor,
                request.isHabilitada(),
                request.getTiposArchivosPermitidos(),
                request.getTamanoMaximoMb(),
                request.getPuntajeMaximo(),
                user
        );

        if (request.getModuloId() != null && request.getModuloId() > 0) {
            moduloRepository.findById(request.getModuloId()).ifPresent(tarea::setModulo);
        }
        tarea.setEsGrupal(request.isEsGrupal());
        if (request.getActividadGrupoId() != null && request.getActividadGrupoId() > 0) {
            actividadGrupoRepository.findById(request.getActividadGrupoId()).ifPresent(tarea::setActividadGrupo);
        } else {
            tarea.setActividadGrupo(null);
        }

        if (Boolean.TRUE.equals(request.getDocumentoColaborativoHabilitado())) {
            validarDocumentoColaborativoGrupal(tarea);
            tarea.setDocumentoColaborativoHabilitado(true);
            tarea.setDocumentoColaborativo(crearDocumentoColaborativoParaTarea(tarea, user));
        }

        Tarea saved = tareaRepository.save(tarea);

        // Guardar rúbrica si fue especificada
        if (request.getRubrica() != null && !request.getRubrica().isEmpty()) {
            double suma = request.getRubrica().stream()
                    .mapToDouble(c -> c.puntajeMaximo() != null ? c.puntajeMaximo() : 0.0)
                    .sum();
            if (suma > saved.getPuntajeMaximo()) {
                throw new IllegalArgumentException("La suma de puntajes de los criterios (" + suma + ") supera el puntaje máximo de la tarea (" + saved.getPuntajeMaximo() + ").");
            }
            for (int i = 0; i < request.getRubrica().size(); i++) {
                MejorasDTOs.CriterioRequest cr = request.getRubrica().get(i);
                RubricaCriterio crit = new RubricaCriterio(
                        saved,
                        cr.nombre(),
                        cr.descripcion(),
                        cr.puntajeMaximo() != null ? cr.puntajeMaximo() : 0.0,
                        i
                );
                rubricaCriterioRepository.save(crit);
            }
        }

        // Notificar NUEVA_TAREA a los estudiantes aceptados
        try {
            List<ConvocatoriaParticipante> estudiantes = participanteRepository
                    .findByConvocatoriaIdAndRolAndEstadoInscripcion(convocatoriaId, Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO);
            for (ConvocatoriaParticipante est : estudiantes) {
                notificacionService.crearNotificacion(
                        est.getUsuario().getId(),
                        Notificacion.NUEVA_TAREA,
                        "Nueva tarea: " + saved.getTitulo(),
                        "Se publicó una nueva tarea en '" + convocatoria.getTitulo() + "'.",
                        convocatoriaId,
                        saved.getId(),
                        null
                );
            }
        } catch (Exception e) {
            // Silencioso
        }

        return toDTO(saved, user);
    }

    public TareaDTO actualizarTarea(Long tareaId, TareaRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        if (!puedeDocenteGestionarTarea(tarea.getConvocatoria(), user)) {
            throw new AccessDeniedException("Solo el docente a cargo del área o un Administrador puede modificar esta tarea.");
        }

        if (request.getTitulo() != null && !request.getTitulo().isBlank()) {
            tarea.setTitulo(request.getTitulo());
        }
        if (request.getDescripcion() != null) {
            tarea.setDescripcion(request.getDescripcion());
        }
        if (request.getFechaHabilitacion() != null) {
            tarea.setFechaHabilitacion(request.getFechaHabilitacion());
        }
        if (request.getFechaEntrega() != null) {
            tarea.setFechaEntrega(request.getFechaEntrega());
        } else if (request.getFechaLimite() != null) {
            tarea.setFechaEntrega(request.getFechaLimite());
        }
        tarea.setFechaCorte(request.getFechaCorte());
        tarea.setHabilitada(request.isHabilitada());
        if (request.getTiposArchivosPermitidos() != null) {
            tarea.setTiposArchivosPermitidos(request.getTiposArchivosPermitidos());
        }
        if (request.getTamanoMaximoMb() != null) {
            tarea.setTamanoMaximoMb(request.getTamanoMaximoMb());
        }
        if (request.getPuntajeMaximo() != null) {
            tarea.setPuntajeMaximo(request.getPuntajeMaximo());
        }
        if (request.getModuloId() != null && request.getModuloId() > 0) {
            moduloRepository.findById(request.getModuloId()).ifPresent(tarea::setModulo);
        } else {
            tarea.setModulo(null);
        }
        tarea.setEsGrupal(request.isEsGrupal());
        if (request.getActividadGrupoId() != null && request.getActividadGrupoId() > 0) {
            actividadGrupoRepository.findById(request.getActividadGrupoId()).ifPresent(tarea::setActividadGrupo);
        } else {
            tarea.setActividadGrupo(null);
        }
        tarea.setUpdatedAt(LocalDateTime.now(ZONA_FICCT));

        // Manejo de rúbrica en actualización:
        // null = no tocar, [] = borrar todos, lista = reemplazar/actualizar
        if (request.getRubrica() != null) {
            if (request.getRubrica().isEmpty()) {
                rubricaCriterioRepository.deleteByTarea(tarea);
            } else {
                double suma = request.getRubrica().stream()
                        .mapToDouble(c -> c.puntajeMaximo() != null ? c.puntajeMaximo() : 0.0)
                        .sum();
                if (suma > tarea.getPuntajeMaximo()) {
                    throw new IllegalArgumentException("La suma de puntajes de los criterios (" + suma + ") supera el puntaje máximo de la tarea (" + tarea.getPuntajeMaximo() + ").");
                }

                List<RubricaCriterio> actuales = rubricaCriterioRepository.findByTareaOrderByOrdenAsc(tarea);
                Set<Long> idsEnviados = request.getRubrica().stream()
                        .map(MejorasDTOs.CriterioRequest::id)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());

                for (RubricaCriterio critActual : actuales) {
                    if (!idsEnviados.contains(critActual.getId())) {
                        puntajeCriterioRepository.deleteByCriterio(critActual);
                        rubricaCriterioRepository.delete(critActual);
                    }
                }

                for (int i = 0; i < request.getRubrica().size(); i++) {
                    MejorasDTOs.CriterioRequest cr = request.getRubrica().get(i);
                    if (cr.id() != null) {
                        RubricaCriterio critExistente = actuales.stream()
                                .filter(a -> a.getId().equals(cr.id()))
                                .findFirst().orElse(null);
                        if (critExistente != null) {
                            critExistente.setNombre(cr.nombre());
                            critExistente.setDescripcion(cr.descripcion());
                            critExistente.setPuntajeMaximo(cr.puntajeMaximo() != null ? cr.puntajeMaximo() : 0.0);
                            critExistente.setOrden(i);
                            rubricaCriterioRepository.save(critExistente);
                        }
                    } else {
                        RubricaCriterio nuevoCrit = new RubricaCriterio(
                                tarea,
                                cr.nombre(),
                                cr.descripcion(),
                                cr.puntajeMaximo() != null ? cr.puntajeMaximo() : 0.0,
                                i
                        );
                        rubricaCriterioRepository.save(nuevoCrit);
                    }
                }
            }
        }
        if (request.getDocumentoColaborativoHabilitado() != null) {
            if (request.getDocumentoColaborativoHabilitado()) {
                validarDocumentoColaborativoGrupal(tarea);
            }
            tarea.setDocumentoColaborativoHabilitado(request.getDocumentoColaborativoHabilitado());
            if (request.getDocumentoColaborativoHabilitado() && tarea.getDocumentoColaborativo() == null) {
                tarea.setDocumentoColaborativo(crearDocumentoColaborativoParaTarea(tarea, user));
            }
        }

        Tarea saved = tareaRepository.save(tarea);
        return toDTO(saved, user);
    }

    public TareaDTO toggleHabilitada(Long tareaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        if (!puedeDocenteGestionarTarea(tarea.getConvocatoria(), user)) {
            throw new AccessDeniedException("Solo un docente a cargo del área puede habilitar o deshabilitar la tarea.");
        }

        tarea.setHabilitada(!tarea.isHabilitada());
        Tarea saved = tareaRepository.save(tarea);
        return toDTO(saved, user);
    }

    @Transactional(readOnly = true)
    public List<TareaDTO> listarPorConvocatoria(Long convocatoriaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área no encontrada con ID: " + convocatoriaId));

        List<Tarea> tareas = tareaRepository.findByConvocatoriaOrderByCreatedAtDesc(convocatoria);
        return tareas.stream().map(t -> toDTO(t, user)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TareaDTO obtenerPorId(Long tareaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));
        return toDTO(tarea, user);
    }

    public EntregaTareaDTO entregarTarea(Long tareaId, EntregaRequest request, String userEmail) {
        User estudiante = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        // 0. Validar que el estudiante esté formalmente admitido en esta área
        if (estudiante.getRol() == Rol.ESTUDIANTE) {
            boolean admitido = participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRolAndEstadoInscripcion(
                    tarea.getConvocatoria().getId(), estudiante.getId(), Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO);
            if (!admitido) {
                throw new AccessDeniedException("Debes estar formalmente admitido en esta área para realizar entregas de tareas.");
            }
        }

        // 1. Control manual de habilitación
        if (!tarea.isHabilitada()) {
            throw new IllegalStateException("La recepción de entregas para esta tarea ha sido deshabilitada por el docente.");
        }

        // 2. Control de triple fecha (Moodle)
        LocalDateTime ahora = LocalDateTime.now(ZONA_FICCT);
        if (tarea.getFechaHabilitacion() != null && ahora.isBefore(tarea.getFechaHabilitacion())) {
            throw new IllegalStateException("La entrega aún no está habilitada. Abre a partir de: " + tarea.getFechaHabilitacion());
        }

        if (tarea.getFechaCorte() != null && ahora.isAfter(tarea.getFechaCorte())) {
            throw new IllegalStateException("La fecha límite de corte ha expirado (" + tarea.getFechaCorte() + "). Ya no se aceptan entregas ni reenvíos.");
        }

        // 3. Validar tipos de archivos permitidos si se sube archivo
        if (request.getNombreArchivo() != null && !request.getNombreArchivo().isBlank()) {
            validarExtensionArchivo(request.getNombreArchivo(), tarea.getTiposArchivosPermitidos());
        }

        Documento doc = null;
        if (request.getDocumentoId() != null) {
            doc = documentoRepository.findById(request.getDocumentoId()).orElse(null);
        }

        Grupo grupoEstudiante = null;
        Optional<ConvocatoriaParticipante> partOpt = participanteRepository
                .findByConvocatoriaIdAndUsuarioId(tarea.getConvocatoria().getId(), estudiante.getId());

        if (partOpt.isPresent()) {
            ConvocatoriaParticipante part = partOpt.get();
            if (request.getGrupoId() != null) {
                if (part.getGrupos() != null) {
                    grupoEstudiante = part.getGrupos().stream()
                            .filter(g -> g.getId() != null && g.getId().equals(request.getGrupoId()))
                            .findFirst().orElse(null);
                }
                if (grupoEstudiante == null && part.getGrupo() != null && part.getGrupo().getId() != null && part.getGrupo().getId().equals(request.getGrupoId())) {
                    grupoEstudiante = part.getGrupo();
                }
                if (grupoEstudiante == null) {
                    throw new AccessDeniedException("No perteneces al grupo seleccionado para esta entrega.");
                }
            }

            // 1. Si la tarea está vinculada a un agrupamiento / actividad de grupo específico
            if (grupoEstudiante == null && tarea.getActividadGrupo() != null) {
                Long targetActividadId = tarea.getActividadGrupo().getId();
                if (part.getGrupos() != null) {
                    grupoEstudiante = part.getGrupos().stream()
                            .filter(g -> g.getActividadGrupo() != null && targetActividadId.equals(g.getActividadGrupo().getId()))
                            .findFirst().orElse(null);
                }
                if (grupoEstudiante == null && part.getGrupo() != null && part.getGrupo().getActividadGrupo() != null && targetActividadId.equals(part.getGrupo().getActividadGrupo().getId())) {
                    grupoEstudiante = part.getGrupo();
                }
                if (grupoEstudiante == null && tarea.isEsGrupal()) {
                    throw new IllegalStateException("Esta tarea es grupal para la actividad '" + tarea.getActividadGrupo().getTitulo() + "'. Aún no perteneces a ningún grupo en esta categoría.");
                }
            }

            // 2. Si no se especificó o no se encontró por actividad, buscar por grupoId explícito enviado
            if (grupoEstudiante == null && request.getGrupoId() != null) {
                if (part.getGrupos() != null) {
                    grupoEstudiante = part.getGrupos().stream()
                            .filter(g -> g.getId() != null && g.getId().equals(request.getGrupoId()))
                            .findFirst().orElse(null);
                }
                if (grupoEstudiante == null && part.getGrupo() != null && part.getGrupo().getId() != null && part.getGrupo().getId().equals(request.getGrupoId())) {
                    grupoEstudiante = part.getGrupo();
                }
            }

            // 3. Fallback a grupos generales del área
            if (grupoEstudiante == null) {
                if (part.getGrupos() != null && !part.getGrupos().isEmpty()) {
                    grupoEstudiante = part.getGrupos().stream()
                            .filter(g -> g.getConvocatoria() != null && g.getConvocatoria().getId().equals(tarea.getConvocatoria().getId()))
                            .findFirst()
                            .orElse(part.getGrupos().get(0));
                } else if (part.getGrupo() != null) {
                    grupoEstudiante = part.getGrupo();
                }
            }
        }

        if (tarea.isEsGrupal() && grupoEstudiante == null) {
            throw new IllegalStateException("Esta tarea es de carácter grupal. Debes pertenecer a un equipo o grupo de trabajo en esta área para realizar la entrega.");
        }

        boolean tarde = tarea.getFechaEntrega() != null && ahora.isAfter(tarea.getFechaEntrega());

        if (tarea.isEsGrupal() && grupoEstudiante != null) {
            List<ConvocatoriaParticipante> miembros = participanteRepository.findMiembrosPorGrupoId(grupoEstudiante.getId());
            if (miembros == null || miembros.isEmpty()) {
                miembros = List.of(partOpt.get());
            }

            EntregaTarea retorno = null;
            for (ConvocatoriaParticipante m : miembros) {
                User companero = m.getUsuario();
                Optional<EntregaTarea> existente = entregaRepository.findByTareaAndEstudiante(tarea, companero);
                EntregaTarea entrega;
                if (existente.isPresent()) {
                    entrega = existente.get();
                    entrega.setDocumento(doc);
                    if (request.getNombreArchivo() != null) entrega.setNombreArchivo(request.getNombreArchivo());
                    if (request.getArchivoUrl() != null) entrega.setArchivoUrl(request.getArchivoUrl());
                    entrega.setComentarioEstudiante(request.getComentarioEstudiante());
                    entrega.setFechaEntrega(ahora);
                    entrega.setEstado(EstadoEntrega.ENTREGADO);
                    entrega.setEntregadoPor(estudiante);
                    entrega.setGrupo(grupoEstudiante);
                    entrega.setNombreEquipo(grupoEstudiante.getNombre());
                    entrega.setConRetraso(tarde);
                } else {
                    entrega = new EntregaTarea(
                            tarea,
                            companero,
                            doc,
                            request.getNombreArchivo(),
                            request.getArchivoUrl(),
                            request.getComentarioEstudiante()
                    );
                    entrega.setFechaEntrega(ahora);
                    entrega.setEntregadoPor(estudiante);
                    entrega.setGrupo(grupoEstudiante);
                    entrega.setNombreEquipo(grupoEstudiante.getNombre());
                    entrega.setConRetraso(tarde);
                }
                EntregaTarea guardada = entregaRepository.save(entrega);

                // Registrar versión / intento
                long intentos = entregaVersionRepository.countByEntrega(guardada);
                EntregaVersion version = new EntregaVersion(
                        guardada,
                        (int) intentos + 1,
                        request.getNombreArchivo(),
                        request.getArchivoUrl(),
                        request.getComentarioEstudiante(),
                        ahora,
                        tarde
                );
                entregaVersionRepository.save(version);

                if (companero.getId().equals(estudiante.getId())) {
                    retorno = guardada;
                }
            }

            // Notificar a los docentes encargados
            notificarEntregaADocentes(tarea, estudiante, retorno != null ? retorno.getId() : null);

            return toEntregaDTO(retorno != null ? retorno : entregaRepository.findByTareaAndEstudiante(tarea, estudiante).orElseThrow(), estudiante);
        }

        // Entrega individual
        Optional<EntregaTarea> existente = entregaRepository.findByTareaAndEstudiante(tarea, estudiante);
        EntregaTarea entrega;
        if (existente.isPresent()) {
            entrega = existente.get();
            entrega.setDocumento(doc);
            if (request.getNombreArchivo() != null) entrega.setNombreArchivo(request.getNombreArchivo());
            if (request.getArchivoUrl() != null) entrega.setArchivoUrl(request.getArchivoUrl());
            entrega.setComentarioEstudiante(request.getComentarioEstudiante());
            entrega.setFechaEntrega(ahora);
            entrega.setEstado(EstadoEntrega.ENTREGADO);
            entrega.setEntregadoPor(estudiante);
            entrega.setConRetraso(tarde);
            if (grupoEstudiante != null) {
                entrega.setGrupo(grupoEstudiante);
                entrega.setNombreEquipo(grupoEstudiante.getNombre());
            }
        } else {
            entrega = new EntregaTarea(
                    tarea,
                    estudiante,
                    doc,
                    request.getNombreArchivo(),
                    request.getArchivoUrl(),
                    request.getComentarioEstudiante()
            );
            entrega.setFechaEntrega(ahora);
            entrega.setEntregadoPor(estudiante);
            entrega.setConRetraso(tarde);
            if (grupoEstudiante != null) {
                entrega.setGrupo(grupoEstudiante);
                entrega.setNombreEquipo(grupoEstudiante.getNombre());
            }
        }

        EntregaTarea saved = entregaRepository.save(entrega);

        // Registrar versión
        long intentos = entregaVersionRepository.countByEntrega(saved);
        EntregaVersion version = new EntregaVersion(
                saved,
                (int) intentos + 1,
                request.getNombreArchivo(),
                request.getArchivoUrl(),
                request.getComentarioEstudiante(),
                ahora,
                tarde
        );
        entregaVersionRepository.save(version);

        // Notificar a los docentes
        notificarEntregaADocentes(tarea, estudiante, saved.getId());

        return toEntregaDTO(saved, estudiante);
    }

    private void notificarEntregaADocentes(Tarea tarea, User estudiante, Long entregaId) {
        try {
            List<ConvocatoriaParticipante> docentes = participanteRepository
                    .findByConvocatoriaIdAndRolAndEstadoInscripcion(
                            tarea.getConvocatoria().getId(), Rol.DOCENTE, EstadoInscripcion.ACEPTADO);
            for (ConvocatoriaParticipante docPart : docentes) {
                notificacionService.crearNotificacion(
                        docPart.getUsuario().getId(),
                        Notificacion.NUEVA_ENTREGA,
                        "Nueva entrega recibida",
                        estudiante.getNombreCompleto() + " realizó una entrega en '" + tarea.getTitulo() + "'.",
                        tarea.getConvocatoria().getId(),
                        tarea.getId(),
                        entregaId
                );
            }
        } catch (Exception e) {
            // Silencioso
        }
    }

    @Transactional(readOnly = true)
    public List<EntregaTareaDTO> listarEntregasPorTarea(Long tareaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        if (!puedeDocenteGestionarTarea(tarea.getConvocatoria(), user) && user.getRol() != Rol.JURADO) {
            throw new AccessDeniedException("Solo el docente a cargo o el jurado puede ver las entregas de esta tarea.");
        }

        List<EntregaTarea> entregas = entregaRepository.findByTareaOrderByFechaEntregaDesc(tarea);
        return entregas.stream().map(e -> toEntregaDTO(e, user)).collect(Collectors.toList());
    }

    public EntregaTareaDTO calificarEntrega(Long entregaId, CalificarEntregaRequest request, String userEmail) {
        User evaluador = getUserByEmail(userEmail);
        EntregaTarea entrega = entregaRepository.findById(entregaId)
                .orElseThrow(() -> new IllegalArgumentException("Entrega no encontrada con ID: " + entregaId));

        Tarea tarea = entrega.getTarea();
        Convocatoria conv = tarea.getConvocatoria();
        boolean esAdmin = evaluador.getRol() == Rol.ADMIN;
        boolean esDocente = participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRol(conv.getId(), evaluador.getId(), Rol.DOCENTE);
        boolean esJurado = participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRol(conv.getId(), evaluador.getId(), Rol.JURADO);

        if (!esAdmin && !esDocente && !esJurado) {
            throw new AccessDeniedException("Solo los docentes o jurados asignados a esta área pueden calificar entregas.");
        }

        List<RubricaCriterio> rubrica = rubricaCriterioRepository.findByTareaOrderByOrdenAsc(tarea);

        // Si la tarea tiene rúbrica y se envían puntajes por criterio
        if (!rubrica.isEmpty() && request.getPuntajesCriterios() != null && !request.getPuntajesCriterios().isEmpty()) {
            Map<Long, RubricaCriterio> critMap = rubrica.stream()
                    .collect(Collectors.toMap(RubricaCriterio::getId, c -> c));

            double sumaPuntajes = 0.0;
            puntajeCriterioRepository.deleteByEntrega(entrega);

            for (MejorasDTOs.PuntajeRequest pr : request.getPuntajesCriterios()) {
                RubricaCriterio crit = critMap.get(pr.criterioId());
                if (crit == null) {
                    throw new IllegalArgumentException("El criterio con ID " + pr.criterioId() + " no pertenece a la rúbrica de esta tarea.");
                }
                double valor = pr.puntaje() != null ? pr.puntaje() : 0.0;
                if (valor < 0 || valor > crit.getPuntajeMaximo()) {
                    throw new IllegalArgumentException("El puntaje (" + valor + ") en el criterio '" + crit.getNombre() + "' debe estar entre 0 y " + crit.getPuntajeMaximo() + ".");
                }
                EntregaPuntajeCriterio epc = new EntregaPuntajeCriterio(entrega, crit, valor);
                puntajeCriterioRepository.save(epc);
                sumaPuntajes += valor;
            }

            if (sumaPuntajes > tarea.getPuntajeMaximo()) {
                throw new IllegalArgumentException("La suma de puntajes (" + sumaPuntajes + ") no puede superar el máximo de la tarea (" + tarea.getPuntajeMaximo() + ").");
            }
            entrega.setCalificacion(sumaPuntajes);
        } else if (request.getCalificacion() != null) {
            // Calificación directa tradicional
            double nota = request.getCalificacion();
            if (nota < 0 || nota > tarea.getPuntajeMaximo()) {
                throw new IllegalArgumentException("La calificación debe estar entre 0 y " + tarea.getPuntajeMaximo() + ".");
            }
            entrega.setCalificacion(nota);
        } else {
            throw new IllegalArgumentException("Debe proporcionar una calificación numérica o las puntuaciones por criterio.");
        }

        entrega.setRetroalimentacion(request.getRetroalimentacion());
        entrega.setFechaCalificacion(LocalDateTime.now(ZONA_FICCT));
        entrega.setCalificadoPor(evaluador);
        entrega.setEstado(EstadoEntrega.CALIFICADO);

        EntregaTarea saved = entregaRepository.save(entrega);

        // Si la tarea es grupal y tiene grupo asociado, propagar la calificación a los compañeros del equipo
        if (entrega.getTarea().isEsGrupal() && entrega.getGrupo() != null) {
            List<EntregaTarea> entregasGrupo = entregaRepository.findByTareaAndGrupo(entrega.getTarea(), entrega.getGrupo());
            for (EntregaTarea eComp : entregasGrupo) {
                if (!eComp.getId().equals(saved.getId())) {
                    eComp.setCalificacion(saved.getCalificacion());
                    eComp.setRetroalimentacion(request.getRetroalimentacion());
                    eComp.setFechaCalificacion(LocalDateTime.now(ZONA_FICCT));
                    eComp.setCalificadoPor(evaluador);
                    eComp.setEstado(EstadoEntrega.CALIFICADO);
                    entregaRepository.save(eComp);
                }
            }
        }

        // Notificar al estudiante que su entrega fue calificada
        try {
            notificacionService.crearNotificacion(
                    entrega.getEstudiante().getId(),
                    Notificacion.ENTREGA_CALIFICADA,
                    "Tu entrega fue calificada",
                    "Tu entrega de '" + tarea.getTitulo() + "' recibió una calificación de " + saved.getCalificacion() + " pts.",
                    conv.getId(),
                    tarea.getId(),
                    saved.getId()
            );
        } catch (Exception e) {
            // Silencioso
        }

        return toEntregaDTO(saved, evaluador);
    }

    // ==========================================
    // SEGUIMIENTO DE SPEEDGRADER
    // ==========================================
    @Transactional(readOnly = true)
    public MejorasDTOs.SeguimientoTarea getSeguimiento(Long tareaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        Convocatoria conv = tarea.getConvocatoria();
        if (!puedeDocenteGestionarTarea(conv, user) && user.getRol() != Rol.JURADO) {
            throw new AccessDeniedException("Solo docentes o jurados asignados a esta área pueden consultar el seguimiento.");
        }

        List<ConvocatoriaParticipante> participantes = participanteRepository
                .findByConvocatoriaIdAndRolAndEstadoInscripcion(conv.getId(), Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO);

        // Ordenar alfabéticamente por apellido y nombre
        participantes.sort(Comparator.comparing((ConvocatoriaParticipante p) -> p.getUsuario().getApellido() != null ? p.getUsuario().getApellido() : "")
                .thenComparing(p -> p.getUsuario().getNombre() != null ? p.getUsuario().getNombre() : ""));

        int totalEstudiantes = participantes.size();
        int entregados = 0;
        int sinEntregar = 0;
        int conRetraso = 0;
        int calificados = 0;

        List<MejorasDTOs.ItemSeguimiento> items = new ArrayList<>();

        for (ConvocatoriaParticipante part : participantes) {
            User estudiante = part.getUsuario();
            Optional<EntregaTarea> entOpt = entregaRepository.findByTareaAndEstudiante(tarea, estudiante);

            String estadoSeg;
            boolean ret = false;
            String grupoNombre = null;
            EntregaTareaDTO entregaDTO = null;

            if (entOpt.isPresent()) {
                EntregaTarea ent = entOpt.get();
                entregaDTO = toEntregaDTO(ent, user);
                ret = ent.isConRetraso();
                grupoNombre = ent.getNombreEquipo() != null ? ent.getNombreEquipo() : (ent.getGrupo() != null ? ent.getGrupo().getNombre() : null);

                if (ent.getEstado() == EstadoEntrega.CALIFICADO) {
                    estadoSeg = "CALIFICADO";
                    calificados++;
                    entregados++;
                } else {
                    estadoSeg = "ENTREGADO";
                    entregados++;
                }

                if (ret) {
                    conRetraso++;
                }
            } else {
                estadoSeg = "SIN_ENTREGAR";
                sinEntregar++;
                if (part.getGrupo() != null) {
                    grupoNombre = part.getGrupo().getNombre();
                } else if (part.getGrupos() != null && !part.getGrupos().isEmpty()) {
                    grupoNombre = part.getGrupos().get(0).getNombre();
                }
            }

            items.add(new MejorasDTOs.ItemSeguimiento(
                    estudiante.getId(),
                    estudiante.getNombreCompleto(),
                    estudiante.getEmail(),
                    estudiante.getFotoPerfil(),
                    grupoNombre,
                    estadoSeg,
                    ret,
                    entregaDTO
            ));
        }

        int porCalificar = entregados - calificados;
        MejorasDTOs.ResumenSeguimiento resumen = new MejorasDTOs.ResumenSeguimiento(
                totalEstudiantes, entregados, sinEntregar, conRetraso, calificados, porCalificar
        );

        return new MejorasDTOs.SeguimientoTarea(
                tarea.getId(),
                tarea.getTitulo(),
                tarea.getPuntajeMaximo(),
                tarea.isEsGrupal(),
                tarea.getFechaEntrega(),
                tarea.getFechaCorte(),
                resumen,
                items
        );
    }

    // ==========================================
    // MIS TAREAS (ESTUDIANTE)
    // ==========================================
    @Transactional(readOnly = true)
    public List<TareaDTO> getMisTareas(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<ConvocatoriaParticipante> misAreas = participanteRepository
                .findByUsuarioIdAndEstadoInscripcion(user.getId(), EstadoInscripcion.ACEPTADO);

        List<TareaDTO> resultado = new ArrayList<>();
        for (ConvocatoriaParticipante part : misAreas) {
            Long convId = part.getConvocatoria().getId();
            List<Tarea> tareas = tareaRepository.findByConvocatoriaIdAndHabilitadaTrueOrderByFechaEntregaAsc(convId);
            for (Tarea t : tareas) {
                resultado.add(toDTO(t, user));
            }
        }

        // Ordenar por fechaEntrega ascendente, nulos al final
        resultado.sort(Comparator.comparing(
                TareaDTO::getFechaEntrega,
                Comparator.nullsLast(Comparator.naturalOrder())
        ));

        return resultado;
    }

    // ==========================================
    // HISTORIAL DE VERSIONES
    // ==========================================
    @Transactional(readOnly = true)
    public List<MejorasDTOs.VersionDTO> getHistorial(Long entregaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        EntregaTarea entrega = entregaRepository.findById(entregaId)
                .orElseThrow(() -> new IllegalArgumentException("Entrega no encontrada con ID: " + entregaId));

        boolean esPropia = entrega.getEstudiante().getId().equals(user.getId());
        boolean esAdmin = user.getRol() == Rol.ADMIN;
        boolean esDocenteOJurado = participanteRepository.existsByConvocatoriaIdAndUsuarioId(
                entrega.getTarea().getConvocatoria().getId(), user.getId());

        if (!esPropia && !esAdmin && !esDocenteOJurado) {
            throw new AccessDeniedException("No tienes permiso para ver el historial de esta entrega.");
        }

        List<EntregaVersion> versiones = entregaVersionRepository.findByEntregaOrderByIntentoDesc(entrega);
        return versiones.stream().map(v -> new MejorasDTOs.VersionDTO(
                v.getId(),
                v.getIntento(),
                v.getNombreArchivo(),
                v.getArchivoUrl(),
                v.getComentario(),
                v.getFechaEntrega(),
                v.isConRetraso()
        )).collect(Collectors.toList());
    }

    // ==========================================
    // EXPORTACIÓN DE NOTAS CSV
    // ==========================================
    @Transactional(readOnly = true)
    public String exportNotasTarea(Long tareaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        if (!puedeDocenteGestionarTarea(tarea.getConvocatoria(), user) && user.getRol() != Rol.JURADO) {
            throw new AccessDeniedException("No tienes permiso para exportar calificaciones de esta tarea.");
        }

        List<ConvocatoriaParticipante> participantes = participanteRepository
                .findByConvocatoriaIdAndRolAndEstadoInscripcion(tarea.getConvocatoria().getId(), Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO);

        StringBuilder sb = new StringBuilder("\uFEFF");
        sb.append("Estudiante,Email,Grupo,Calificacion,PuntajeMaximo,Estado,ConRetraso,FechaEntrega,Retroalimentacion\n");

        for (ConvocatoriaParticipante part : participantes) {
            User est = part.getUsuario();
            Optional<EntregaTarea> entOpt = entregaRepository.findByTareaAndEstudiante(tarea, est);

            String grupo = entOpt.map(EntregaTarea::getNombreEquipo).orElse(
                    part.getGrupo() != null ? part.getGrupo().getNombre() : (part.getGrupos() != null && !part.getGrupos().isEmpty() ? part.getGrupos().get(0).getNombre() : "")
            );

            String calif = entOpt.map(e -> e.getCalificacion() != null ? String.valueOf(e.getCalificacion()) : "").orElse("");
            String estado = entOpt.map(e -> e.getEstado().name()).orElse("SIN_ENTREGAR");
            String ret = entOpt.map(e -> e.isConRetraso() ? "SI" : "NO").orElse("NO");
            String fecha = entOpt.map(e -> e.getFechaEntrega() != null ? e.getFechaEntrega().toString() : "").orElse("");
            String retro = entOpt.map(e -> e.getRetroalimentacion() != null ? e.getRetroalimentacion().replace("\"", "\"\"") : "").orElse("");

            sb.append(escapeCsv(est.getNombreCompleto())).append(",")
                    .append(escapeCsv(est.getEmail())).append(",")
                    .append(escapeCsv(grupo)).append(",")
                    .append(calif).append(",")
                    .append(tarea.getPuntajeMaximo()).append(",")
                    .append(estado).append(",")
                    .append(ret).append(",")
                    .append(escapeCsv(fecha)).append(",")
                    .append("\"").append(retro).append("\"\n");
        }

        return sb.toString();
    }

    @Transactional(readOnly = true)
    public String exportNotasConvocatoria(Long convocatoriaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada con ID: " + convocatoriaId));

        if (!puedeDocenteGestionarTarea(conv, user) && user.getRol() != Rol.JURADO) {
            throw new AccessDeniedException("No tienes permiso para exportar el libro de calificaciones de esta área.");
        }

        List<Tarea> tareas = tareaRepository.findByConvocatoriaOrderByCreatedAtDesc(conv);
        List<ConvocatoriaParticipante> participantes = participanteRepository
                .findByConvocatoriaIdAndRolAndEstadoInscripcion(convocatoriaId, Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO);

        StringBuilder sb = new StringBuilder("\uFEFF");
        sb.append("Estudiante,Email");
        for (Tarea t : tareas) {
            sb.append(",").append(escapeCsv(t.getTitulo() + " (Max " + t.getPuntajeMaximo() + ")"));
        }
        sb.append(",PuntajeTotalObtenido,PuntajeTotalPosible\n");

        double totalPosible = tareas.stream().mapToDouble(t -> t.getPuntajeMaximo() != null ? t.getPuntajeMaximo() : 0.0).sum();

        for (ConvocatoriaParticipante part : participantes) {
            User est = part.getUsuario();
            sb.append(escapeCsv(est.getNombreCompleto())).append(",")
                    .append(escapeCsv(est.getEmail()));

            double totalObtenido = 0.0;
            for (Tarea t : tareas) {
                Optional<EntregaTarea> entOpt = entregaRepository.findByTareaAndEstudiante(t, est);
                if (entOpt.isPresent() && entOpt.get().getCalificacion() != null) {
                    double nota = entOpt.get().getCalificacion();
                    totalObtenido += nota;
                    sb.append(",").append(nota);
                } else if (entOpt.isPresent()) {
                    sb.append(",").append("Entregado (Sin calificar)");
                } else {
                    sb.append(",").append("Sin entrega");
                }
            }
            sb.append(",").append(totalObtenido).append(",").append(totalPosible).append("\n");
        }

        return sb.toString();
    }

    private String escapeCsv(String str) {
        if (str == null) return "";
        if (str.contains(",") || str.contains("\"") || str.contains("\n")) {
            return "\"" + str.replace("\"", "\"\"") + "\"";
        }
        return str;
    }

    // ==========================================
    // ADMISIÓN EN LOTE
    // ==========================================
    public MejorasDTOs.ResultadoLote responderLote(Long convocatoriaId, MejorasDTOs.ResponderLoteRequest req, String userEmail) {
        User user = getUserByEmail(userEmail);
        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área no encontrada con ID: " + convocatoriaId));

        if (!puedeDocenteGestionarTarea(conv, user)) {
            throw new AccessDeniedException("Solo un docente a cargo o administrador puede responder solicitudes.");
        }

        if (req == null || req.participanteIds() == null || req.participanteIds().isEmpty()) {
            return new MejorasDTOs.ResultadoLote(0, List.of("No se proporcionaron participantes."));
        }

        int procesados = 0;
        List<String> errores = new ArrayList<>();

        for (Long pid : req.participanteIds()) {
            try {
                if ("ADMITIR".equalsIgnoreCase(req.accion())) {
                    convocatoriaService.admitirEstudiante(convocatoriaId, pid, userEmail);
                    procesados++;
                } else if ("RECHAZAR".equalsIgnoreCase(req.accion())) {
                    convocatoriaService.rechazarEstudiante(convocatoriaId, pid, req.motivo(), userEmail);
                    procesados++;
                } else {
                    errores.add("Acción desconocida '" + req.accion() + "' para participante " + pid);
                }
            } catch (Exception e) {
                errores.add("Participante ID " + pid + ": " + e.getMessage());
            }
        }

        return new MejorasDTOs.ResultadoLote(procesados, errores);
    }

    public DocumentoDTO obtenerDocumentoColaborativo(Long tareaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        if (!tarea.isDocumentoColaborativoHabilitado()) {
            throw new IllegalStateException("Esta actividad no tiene documento colaborativo habilitado.");
        }

        String permiso = resolverPermisoDocumentoColaborativo(tarea, user);
        if (permiso == null) {
            throw new AccessDeniedException("No tienes acceso al documento colaborativo de esta actividad.");
        }

        if (tarea.getDocumentoColaborativo() == null) {
            if (!puedeDocenteGestionarTarea(tarea.getConvocatoria(), user)) {
                throw new AccessDeniedException("El documento colaborativo aun no fue inicializado por el docente.");
            }
            tarea.setDocumentoColaborativo(crearDocumentoColaborativoParaTarea(tarea, user));
            tareaRepository.save(tarea);
        }

        return toDocumentoDTO(tarea.getDocumentoColaborativo(), tarea, user);
    }

    private Documento crearDocumentoColaborativoParaTarea(Tarea tarea, User autor) {
        String contenidoInicial = "<h1>" + escapeHtml(tarea.getTitulo()) + "</h1>"
                + "<p>Escribe aqui el desarrollo colaborativo de la actividad.</p>"
                + "<h2>Objetivos</h2><ol><li>Objetivo principal</li></ol>"
                + "<h2>Desarrollo</h2><p></p>"
                + "<h2>Conclusiones</h2><p></p>";
        Documento doc = new Documento(
                "Documento colaborativo - " + tarea.getTitulo(),
                "Documento colaborativo asociado a la actividad: " + tarea.getTitulo(),
                "ACTIVIDAD",
                contenidoInicial,
                autor,
                tarea.getConvocatoria()
        );
        return documentoRepository.save(doc);
    }

    private void validarDocumentoColaborativoGrupal(Tarea tarea) {
        if (!tarea.isEsGrupal() || tarea.getActividadGrupo() == null) {
            throw new IllegalArgumentException("El documento colaborativo debe estar vinculado a una tarea grupal con actividad de grupos.");
        }
    }

    private String resolverPermisoDocumentoColaborativo(Tarea tarea, User user) {
        if (user.getRol() == Rol.ADMIN) return "OWNER";
        if (puedeDocenteGestionarTarea(tarea.getConvocatoria(), user)) return "LECTURA";
        return estudiantePerteneceAGrupoDeTarea(tarea, user) ? "EDICION" : null;
    }

    private boolean estudiantePerteneceAGrupoDeTarea(Tarea tarea, User user) {
        if (user.getRol() != Rol.ESTUDIANTE || !tarea.isEsGrupal() || tarea.getActividadGrupo() == null) {
            return false;
        }
        Optional<ConvocatoriaParticipante> partOpt = participanteRepository
                .findByConvocatoriaIdAndUsuarioId(tarea.getConvocatoria().getId(), user.getId());
        if (partOpt.isEmpty()) {
            return false;
        }
        ConvocatoriaParticipante part = partOpt.get();
        if (part.getRol() != Rol.ESTUDIANTE || part.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) {
            return false;
        }
        Long targetActividadId = tarea.getActividadGrupo().getId();
        boolean enGrupoDeActividad = part.getGrupos() != null && part.getGrupos().stream()
                .anyMatch(g -> g.getActividadGrupo() != null && targetActividadId.equals(g.getActividadGrupo().getId()));
        if (enGrupoDeActividad) {
            return true;
        }
        return part.getGrupo() != null
                && part.getGrupo().getActividadGrupo() != null
                && targetActividadId.equals(part.getGrupo().getActividadGrupo().getId());
    }

    private void validarExtensionArchivo(String nombreArchivo, String permitidos) {
        if (permitidos == null || permitidos.isBlank() || "*".equals(permitidos.trim())) {
            return;
        }
        if (nombreArchivo == null || nombreArchivo.isBlank()) {
            return;
        }
        List<String> permitidas = Arrays.stream(permitidos.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .collect(Collectors.toList());

        String[] archivos = nombreArchivo.split(",");
        for (String arch : archivos) {
            String archTrim = arch.trim();
            if (archTrim.isEmpty()) continue;
            int lastDot = archTrim.lastIndexOf('.');
            if (lastDot == -1) {
                throw new IllegalArgumentException("El archivo '" + archTrim + "' debe tener una extensión válida.");
            }
            String ext = archTrim.substring(lastDot).toLowerCase().trim();
            boolean valida = permitidas.stream().anyMatch(p -> p.equalsIgnoreCase(ext) || p.equalsIgnoreCase(ext.replace(".", "")));
            if (!valida) {
                throw new IllegalArgumentException("Tipo de archivo no permitido para '" + archTrim + "'. Se admiten únicamente: " + permitidos);
            }
        }
    }

    private TareaDTO toDTO(Tarea tarea, User currentUser) {
        TareaDTO dto = new TareaDTO();
        dto.setId(tarea.getId());
        dto.setConvocatoriaId(tarea.getConvocatoria().getId());
        dto.setConvocatoriaTitulo(tarea.getConvocatoria().getTitulo());
        dto.setTitulo(tarea.getTitulo());
        dto.setDescripcion(tarea.getDescripcion());
        dto.setFechaHabilitacion(tarea.getFechaHabilitacion());
        dto.setFechaEntrega(tarea.getFechaEntrega());
        dto.setFechaCorte(tarea.getFechaCorte());
        dto.setFechaLimite(tarea.getFechaLimite());
        dto.setHabilitada(tarea.isHabilitada());
        dto.setTiposArchivosPermitidos(tarea.getTiposArchivosPermitidos());
        dto.setTamanoMaximoMb(tarea.getTamanoMaximoMb());
        dto.setPuntajeMaximo(tarea.getPuntajeMaximo());
        if (tarea.getCreador() != null) {
            dto.setCreadorId(tarea.getCreador().getId());
            dto.setCreadorNombre(tarea.getCreador().getNombreCompleto());
        }
        if (tarea.getModulo() != null) {
            dto.setModuloId(tarea.getModulo().getId());
            dto.setModuloTitulo(tarea.getModulo().getTitulo());
        }
        dto.setDocumentoColaborativoHabilitado(tarea.isDocumentoColaborativoHabilitado());
        if (tarea.getDocumentoColaborativo() != null) {
            dto.setDocumentoColaborativoId(tarea.getDocumentoColaborativo().getId());
            dto.setDocumentoColaborativoTitulo(tarea.getDocumentoColaborativo().getTitulo());
        }
        dto.setTotalEntregas(tarea.getEntregas().size());
        dto.setCreatedAt(tarea.getCreatedAt());
        dto.setUpdatedAt(tarea.getUpdatedAt());

        // Estado Moodle computado
        LocalDateTime ahora = LocalDateTime.now(ZONA_FICCT);
        if (!tarea.isHabilitada()) {
            dto.setEstadoMoodle("DESHABILITADA");
        } else if (tarea.getFechaHabilitacion() != null && ahora.isBefore(tarea.getFechaHabilitacion())) {
            dto.setEstadoMoodle("PENDIENTE_APERTURA");
        } else if (tarea.getFechaCorte() != null && ahora.isAfter(tarea.getFechaCorte())) {
            dto.setEstadoMoodle("CERRADA_CORTE");
        } else if (tarea.getFechaEntrega() != null && ahora.isAfter(tarea.getFechaEntrega())) {
            dto.setEstadoMoodle("ENTREGA_CON_RETRASO");
        } else {
            dto.setEstadoMoodle("ABIERTA");
        }

        dto.setEsGrupal(tarea.isEsGrupal());
        if (tarea.getActividadGrupo() != null) {
            dto.setActividadGrupoId(tarea.getActividadGrupo().getId());
            dto.setActividadGrupoTitulo(tarea.getActividadGrupo().getTitulo());
        }

        // Poblar rúbrica
        List<RubricaCriterio> rubricaList = rubricaCriterioRepository.findByTareaOrderByOrdenAsc(tarea);
        if (rubricaList != null && !rubricaList.isEmpty()) {
            dto.setRubrica(rubricaList.stream().map(c -> new MejorasDTOs.CriterioDTO(
                    c.getId(), c.getNombre(), c.getDescripcion(), c.getPuntajeMaximo(), c.getOrden()
            )).collect(Collectors.toList()));
        } else {
            dto.setRubrica(new ArrayList<>());
        }

        if (currentUser.getRol() == Rol.ESTUDIANTE) {
            Optional<EntregaTarea> miEntOpt = entregaRepository.findByTareaAndEstudiante(tarea, currentUser);
            if (miEntOpt.isPresent()) {
                dto.setMiEntrega(toEntregaDTO(miEntOpt.get(), currentUser));
            } else if (tarea.isEsGrupal()) {
                // Fallback grupal: si el compañero del equipo entregó, mostrar la entrega al alumno
                Optional<ConvocatoriaParticipante> partOpt = participanteRepository
                        .findByConvocatoriaIdAndUsuarioId(tarea.getConvocatoria().getId(), currentUser.getId());
                if (partOpt.isPresent()) {
                    ConvocatoriaParticipante part = partOpt.get();
                    Grupo miGrupo = null;
                    if (tarea.getActividadGrupo() != null && part.getGrupos() != null) {
                        Long targetActId = tarea.getActividadGrupo().getId();
                        miGrupo = part.getGrupos().stream()
                                .filter(g -> g.getActividadGrupo() != null && targetActId.equals(g.getActividadGrupo().getId()))
                                .findFirst().orElse(null);
                    }
                    if (miGrupo == null) {
                        miGrupo = (part.getGrupos() != null && !part.getGrupos().isEmpty()) ? part.getGrupos().get(0) : part.getGrupo();
                    }
                    if (miGrupo != null) {
                        Optional<EntregaTarea> entregaGrupo = entregaRepository.findFirstByTareaAndGrupo(tarea, miGrupo);
                        entregaGrupo.ifPresent(e -> dto.setMiEntrega(toEntregaDTO(e, currentUser)));
                    }
                }
            }

            // Calcular miEstado personal del estudiante
            boolean hayEntrega = dto.getMiEntrega() != null;
            if (!tarea.isHabilitada() || (tarea.getFechaHabilitacion() != null && ahora.isBefore(tarea.getFechaHabilitacion()))) {
                dto.setMiEstado("NO_DISPONIBLE");
            } else if (hayEntrega && dto.getMiEntrega().getEstado() == EstadoEntrega.CALIFICADO) {
                dto.setMiEstado("CALIFICADO");
            } else if (hayEntrega && dto.getMiEntrega().isConRetraso()) {
                dto.setMiEstado("ENTREGADO_CON_RETRASO");
            } else if (hayEntrega) {
                dto.setMiEstado("ENTREGADO");
            } else if (tarea.getFechaCorte() != null && ahora.isAfter(tarea.getFechaCorte())) {
                dto.setMiEstado("VENCIDA");
            } else {
                dto.setMiEstado("PENDIENTE");
            }
        }

        return dto;
    }

    private EntregaTareaDTO toEntregaDTO(EntregaTarea entrega) {
        return toEntregaDTO(entrega, null);
    }

    private EntregaTareaDTO toEntregaDTO(EntregaTarea entrega, User currentUser) {
        EntregaTareaDTO dto = new EntregaTareaDTO();
        dto.setId(entrega.getId());
        dto.setTareaId(entrega.getTarea().getId());
        dto.setTareaTitulo(entrega.getTarea().getTitulo());
        dto.setEstudianteId(entrega.getEstudiante().getId());
        dto.setEstudianteNombre(entrega.getEstudiante().getNombreCompleto());
        dto.setEstudianteEmail(entrega.getEstudiante().getEmail());

        if (entrega.getDocumento() != null) {
            dto.setDocumentoId(entrega.getDocumento().getId());
            dto.setDocumentoTitulo(entrega.getDocumento().getTitulo());
        }

        dto.setNombreArchivo(entrega.getNombreArchivo());
        dto.setArchivoUrl(entrega.getArchivoUrl());
        dto.setComentarioEstudiante(entrega.getComentarioEstudiante());
        dto.setFechaEntrega(entrega.getFechaEntrega());
        dto.setEstado(entrega.getEstado());
        dto.setCalificacion(entrega.getCalificacion());
        dto.setRetroalimentacion(entrega.getRetroalimentacion());
        dto.setFechaCalificacion(entrega.getFechaCalificacion());

        if (entrega.getCalificadoPor() != null) {
            dto.setCalificadoPorNombre(entrega.getCalificadoPor().getNombreCompleto());
        }

        dto.setEsGrupal(entrega.getTarea() != null && entrega.getTarea().isEsGrupal());

        // Identificar quién envió físicamente la tarea
        if (entrega.getEntregadoPor() != null) {
            dto.setEntregadoPorId(entrega.getEntregadoPor().getId());
            dto.setEntregadoPorNombre(entrega.getEntregadoPor().getNombreCompleto());
            dto.setEntregadoPorEmail(entrega.getEntregadoPor().getEmail());
            if (currentUser != null) {
                dto.setEsMiEntregaPropia(entrega.getEntregadoPor().getId().equals(currentUser.getId()));
            }
        } else if (entrega.getEstudiante() != null) {
            dto.setEntregadoPorId(entrega.getEstudiante().getId());
            dto.setEntregadoPorNombre(entrega.getEstudiante().getNombreCompleto());
            dto.setEntregadoPorEmail(entrega.getEstudiante().getEmail());
            if (currentUser != null) {
                dto.setEsMiEntregaPropia(entrega.getEstudiante().getId().equals(currentUser.getId()));
            }
        }

        // Información de Grupo y compañeros
        if (entrega.getGrupo() != null) {
            dto.setGrupoId(entrega.getGrupo().getId());
            dto.setGrupoNombre(entrega.getGrupo().getNombre());
            List<ConvocatoriaParticipante> miembros = participanteRepository.findMiembrosPorGrupoId(entrega.getGrupo().getId());
            if (miembros != null && !miembros.isEmpty()) {
                dto.setCompanerosEquipo(miembros.stream()
                        .map(m -> m.getUsuario().getNombreCompleto())
                        .collect(Collectors.toList()));
            }
        } else if (entrega.getNombreEquipo() != null) {
            dto.setGrupoNombre(entrega.getNombreEquipo());
        }

        // Mejoras: retraso, intentos, puntaje máximo y puntajes por criterio
        dto.setConRetraso(entrega.isConRetraso());
        if (entrega.getTarea() != null) {
            dto.setPuntajeMaximoTarea(entrega.getTarea().getPuntajeMaximo());
        }
        long intentos = entregaVersionRepository.countByEntrega(entrega);
        dto.setIntentos((int) Math.max(1, intentos));

        List<EntregaPuntajeCriterio> puntajes = puntajeCriterioRepository.findByEntrega(entrega);
        if (puntajes != null && !puntajes.isEmpty()) {
            dto.setPuntajesCriterios(puntajes.stream().map(p -> new MejorasDTOs.PuntajeDTO(
                    p.getCriterio().getId(),
                    p.getCriterio().getNombre(),
                    p.getPuntaje(),
                    p.getCriterio().getPuntajeMaximo()
            )).collect(Collectors.toList()));
        }

        return dto;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no autenticado"));
    }

    private DocumentoDTO toDocumentoDTO(Documento doc, Tarea tarea, User currentUser) {
        DocumentoDTO dto = new DocumentoDTO();
        dto.setId(doc.getId());
        dto.setTitulo(doc.getTitulo());
        dto.setDescripcion(doc.getDescripcion());
        dto.setCategoria(doc.getCategoria());
        dto.setContenido(doc.getContenido());
        dto.setEstado(doc.getEstado());
        dto.setAutorId(doc.getAutor().getId());
        dto.setAutorNombre(doc.getAutor().getNombreCompleto());
        dto.setAutorEmail(doc.getAutor().getEmail());
        dto.setConvocatoriaId(tarea.getConvocatoria().getId());
        dto.setConvocatoriaTitulo(tarea.getConvocatoria().getTitulo());
        dto.setTareaId(tarea.getId());
        dto.setTareaTitulo(tarea.getTitulo());
        dto.setMiPermiso(resolverPermisoDocumentoColaborativo(tarea, currentUser));
        dto.setCreatedAt(doc.getCreatedAt());
        dto.setUpdatedAt(doc.getUpdatedAt());
        return dto;
    }

    private String escapeHtml(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
