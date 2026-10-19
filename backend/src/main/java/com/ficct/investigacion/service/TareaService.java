package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.exception.TareaConEntregasException;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.context.annotation.Lazy;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${feature.documentos-colaborativos.enabled:false}")
    private boolean documentosColaborativosHabilitados;

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
    private final FeriaPostulacionRepository feriaPostulacionRepository;
    private final GrupoRepository grupoRepository;
    private final JuradoAsignacionService juradoAsignacionService;

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
                        @Lazy ConvocatoriaService convocatoriaService,
                        FeriaPostulacionRepository feriaPostulacionRepository,
                        GrupoRepository grupoRepository,
                        JuradoAsignacionService juradoAsignacionService) {
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
        this.feriaPostulacionRepository = feriaPostulacionRepository;
        this.grupoRepository = grupoRepository;
        this.juradoAsignacionService = juradoAsignacionService;
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

    private void actualizarAdjuntos(Tarea tarea, List<AdjuntoTareaDTO> adjuntos) {
        if (adjuntos.size() > 10) {
            throw new IllegalArgumentException("La tarea admite como máximo 10 archivos adjuntos.");
        }
        List<AdjuntoTarea> validados = new ArrayList<>();
        for (AdjuntoTareaDTO adjunto : adjuntos) {
            if (adjunto == null || adjunto.nombre() == null || adjunto.nombre().isBlank() ||
                    adjunto.nombre().length() > 255 || adjunto.ruta() == null ||
                    !adjunto.ruta().matches("/api/uploads/[0-9a-fA-F]{8}_[A-Za-z0-9._-]+") ||
                    adjunto.tamanoBytes() == null || adjunto.tamanoBytes() < 0 ||
                    adjunto.tamanoBytes() > 50L * 1024 * 1024) {
                throw new IllegalArgumentException("Los datos de uno de los archivos adjuntos no son válidos.");
            }
            validados.add(new AdjuntoTarea(adjunto.nombre().trim(), adjunto.ruta(), adjunto.tamanoBytes()));
        }
        tarea.getAdjuntos().clear();
        tarea.getAdjuntos().addAll(validados);
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
        LocalDateTime fechaCor = request.getFechaCorte();

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
        tarea.setVisibleJurados(Boolean.TRUE.equals(request.getVisibleJurados()));
        tarea.setActividadGrupo(null);
        if (request.getAdjuntos() != null) {
            actualizarAdjuntos(tarea, request.getAdjuntos());
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

        boolean fechasPendientes = (tarea.isPlantillaFeria() || tarea.isPlantillaModulo()) &&
                (tarea.getFechaHabilitacion() == null || tarea.getFechaEntrega() == null);

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
        if (tarea.isPlantillaFeria() || tarea.isPlantillaModulo()) {
            if (tarea.getFechaHabilitacion() != null && tarea.getFechaEntrega() != null &&
                    !tarea.getFechaEntrega().isAfter(tarea.getFechaHabilitacion())) {
                throw new IllegalArgumentException("La fecha de entrega debe ser posterior a la fecha de inicio.");
            }
            if (fechasPendientes && tarea.getFechaHabilitacion() != null && tarea.getFechaEntrega() != null) {
                tarea.setHabilitada(true);
            }
            if (tarea.getFechaHabilitacion() == null || tarea.getFechaEntrega() == null) {
                tarea.setHabilitada(false);
            }
        }
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
        if (request.getVisibleJurados() != null) {
            tarea.setVisibleJurados(request.getVisibleJurados());
        }
        tarea.setActividadGrupo(null);
        if (request.getAdjuntos() != null) {
            actualizarAdjuntos(tarea, request.getAdjuntos());
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

        Tarea saved = tareaRepository.save(tarea);
        if (fechasPendientes && saved.isPlantillaFeria() && saved.isVisibleParaEstudiantes()) {
            for (FeriaPostulacion equipo : feriaPostulacionRepository
                    .findByConvocatoriaIdOrderByIdAsc(saved.getConvocatoria().getId())) {
                if (equipo.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) continue;
                for (FeriaIntegrante integrante : equipo.getIntegrantes()) {
                    userRepository.findByEmail(integrante.getCorreo()).ifPresent(miembro -> {
                        try {
                            notificacionService.crearNotificacion(miembro.getId(), Notificacion.NUEVA_TAREA,
                                    "Nueva actividad — " + equipo.getCodigoEquipo(),
                                    "Se habilitó '" + saved.getTitulo() + "' para el equipo " + equipo.getCodigoEquipo() + ".",
                                    saved.getConvocatoria().getId(), saved.getId(), null);
                        } catch (Exception ignored) { }
                    });
                }
            }
        }
        return toDTO(saved, user);
    }

    public TareaDTO toggleHabilitada(Long tareaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        if (!puedeDocenteGestionarTarea(tarea.getConvocatoria(), user)) {
            throw new AccessDeniedException("Solo un docente a cargo del área puede habilitar o deshabilitar la tarea.");
        }

        if ((tarea.isPlantillaFeria() || tarea.isPlantillaModulo()) && !tarea.isHabilitada() &&
                (tarea.getFechaHabilitacion() == null || tarea.getFechaEntrega() == null)) {
            throw new IllegalStateException("Define la fecha de inicio y la fecha de entrega antes de mostrar esta actividad.");
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

        if (user.getRol() == Rol.ESTUDIANTE && !participanteRepository
                .existsByConvocatoriaIdAndUsuarioIdAndRolAndEstadoInscripcion(
                        convocatoriaId, user.getId(), Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO)) {
            return List.of();
        }

        List<Tarea> tareas = tareaRepository.findByConvocatoriaOrderByCreatedAtDesc(convocatoria);
        boolean gestor = puedeDocenteGestionarTarea(convocatoria, user);
        List<FeriaPostulacion> equipos = equiposAceptados(convocatoriaId, user);
        List<TareaDTO> resultado = new ArrayList<>();
        for (Tarea tarea : tareas) {
            if (!gestor && !tarea.isVisibleParaEstudiantes()) continue;
            if (!gestor && tarea.isPlantillaFeria()) {
                for (FeriaPostulacion equipo : equipos) resultado.add(toDTO(tarea, user, equipo));
            } else {
                resultado.add(toDTO(tarea, user));
            }
        }
        return resultado;
    }

    @Transactional(readOnly = true)
    public TareaDTO obtenerPorId(Long tareaId, String userEmail, Long feriaPostulacionId) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));
        if (user.getRol() == Rol.ESTUDIANTE && !participanteRepository
                .existsByConvocatoriaIdAndUsuarioIdAndRolAndEstadoInscripcion(
                        tarea.getConvocatoria().getId(), user.getId(), Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO)) {
            throw new AccessDeniedException("Debes estar admitido en esta convocatoria para ver sus actividades.");
        }
        if (!puedeDocenteGestionarTarea(tarea.getConvocatoria(), user) && !tarea.isVisibleParaEstudiantes()) {
            throw new AccessDeniedException("Esta actividad todavía no está disponible.");
        }
        if (tarea.isPlantillaFeria() && user.getRol() == Rol.ESTUDIANTE) {
            FeriaPostulacion equipo = equipoAceptado(tarea, user, feriaPostulacionId);
            return toDTO(tarea, user, equipo);
        }
        return toDTO(tarea, user);
    }

    private List<FeriaPostulacion> equiposAceptados(Long convocatoriaId, User user) {
        return feriaPostulacionRepository.findByCorreoIntegrante(user.getEmail()).stream()
                .filter(p -> p.getConvocatoria().getId().equals(convocatoriaId)
                        && p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                .sorted(Comparator.comparing(FeriaPostulacion::getId)).toList();
    }

    private FeriaPostulacion equipoAceptado(Tarea tarea, User user, Long equipoId) {
        if (equipoId == null) {
            throw new IllegalArgumentException("Selecciona el equipo de Feria para esta actividad.");
        }
        return equiposAceptados(tarea.getConvocatoria().getId(), user).stream()
                .filter(p -> p.getId().equals(equipoId)).findFirst()
                .orElseThrow(() -> new AccessDeniedException("No perteneces a este equipo admitido de Feria."));
    }

    public EntregaTareaDTO entregarTarea(Long tareaId, EntregaRequest request, String userEmail) {
        User estudiante = getUserByEmail(userEmail);
        if (estudiante.getRol() != Rol.ESTUDIANTE) {
            throw new AccessDeniedException("Solo los estudiantes pueden entregar tareas.");
        }
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
        if (!tarea.isVisibleParaEstudiantes()) {
            throw new IllegalStateException("La actividad aún no tiene sus fechas definidas.");
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
        if (documentosColaborativosHabilitados && request.getDocumentoId() != null) {
            doc = documentoRepository.findById(request.getDocumentoId()).orElse(null);
        }

        if (tarea.isPlantillaFeria()) {
            return entregarFeria(tarea, estudiante, request, ahora, tardeEntrega(tarea, ahora));
        }

        Grupo grupoEstudiante = null;
        Optional<ConvocatoriaParticipante> partOpt = participanteRepository
                .findByConvocatoriaIdAndUsuarioId(tarea.getConvocatoria().getId(), estudiante.getId());

        if (partOpt.isPresent()) {
            ConvocatoriaParticipante part = partOpt.get();

            // Si el alumno pertenece a varios equipos, usar el que eligió para esta entrega.
            if (grupoEstudiante == null && request.getGrupoId() != null) {
                if (part.getGrupos() != null) {
                    grupoEstudiante = part.getGrupos().stream()
                            .filter(g -> g.getId().equals(request.getGrupoId()))
                            .findFirst().orElse(null);
                }
                if (grupoEstudiante == null && part.getGrupo() != null && part.getGrupo().getId().equals(request.getGrupoId())) {
                    grupoEstudiante = part.getGrupo();
                }
            }

            // Si no indicó equipo, usar su grupo del aula.
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
                    if (entrega.getEstado() == EstadoEntrega.CALIFICADO) {
                        entrega.setCalificacion(null);
                        entrega.setRetroalimentacion(null);
                        entrega.setFechaCalificacion(null);
                        entrega.setCalificadoPor(null);
                        puntajeCriterioRepository.deleteByEntrega(entrega);
                    }
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
            notificarEntregaADocentes(tarea, estudiante, retorno != null ? retorno.getId() : null, null);

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
            if (entrega.getEstado() == EstadoEntrega.CALIFICADO) {
                entrega.setCalificacion(null);
                entrega.setRetroalimentacion(null);
                entrega.setFechaCalificacion(null);
                entrega.setCalificadoPor(null);
                puntajeCriterioRepository.deleteByEntrega(entrega);
            }
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
        notificarEntregaADocentes(tarea, estudiante, saved.getId(), null);

        return toEntregaDTO(saved, estudiante);
    }

    private boolean tardeEntrega(Tarea tarea, LocalDateTime ahora) {
        return tarea.getFechaEntrega() != null && ahora.isAfter(tarea.getFechaEntrega());
    }

    private EntregaTareaDTO entregarFeria(Tarea tarea, User estudiante, EntregaRequest request,
                                          LocalDateTime ahora, boolean tarde) {
        FeriaPostulacion equipo = equipoAceptado(tarea, estudiante, request.getFeriaPostulacionId());
        EntregaTarea entrega = entregaRepository.findByTareaAndFeriaPostulacion(tarea, equipo)
                .orElseGet(() -> new EntregaTarea(tarea, estudiante, null,
                        request.getNombreArchivo(), request.getArchivoUrl(), request.getComentarioEstudiante()));
        if (request.getNombreArchivo() != null) entrega.setNombreArchivo(request.getNombreArchivo());
        if (request.getArchivoUrl() != null) entrega.setArchivoUrl(request.getArchivoUrl());
        entrega.setComentarioEstudiante(request.getComentarioEstudiante());
        entrega.setFechaEntrega(ahora);
        entrega.setEntregadoPor(estudiante);
        entrega.setFeriaPostulacion(equipo);
        entrega.setNombreEquipo(equipo.getCodigoEquipo());
        entrega.setConRetraso(tarde);
        if (entrega.getEstado() == EstadoEntrega.CALIFICADO) {
            entrega.setCalificacion(null);
            entrega.setRetroalimentacion(null);
            entrega.setFechaCalificacion(null);
            entrega.setCalificadoPor(null);
            puntajeCriterioRepository.deleteByEntrega(entrega);
        }
        entrega.setEstado(EstadoEntrega.ENTREGADO);
        EntregaTarea guardada = entregaRepository.save(entrega);
        long intentos = entregaVersionRepository.countByEntrega(guardada);
        entregaVersionRepository.save(new EntregaVersion(guardada, (int) intentos + 1,
                request.getNombreArchivo(), request.getArchivoUrl(), request.getComentarioEstudiante(), ahora, tarde));
        notificarEntregaADocentes(tarea, estudiante, guardada.getId(), equipo.getCodigoEquipo());
        return toEntregaDTO(guardada, estudiante);
    }

    private void notificarEntregaADocentes(Tarea tarea, User estudiante, Long entregaId, String codigoEquipo) {
        try {
            List<ConvocatoriaParticipante> docentes = participanteRepository
                    .findByConvocatoriaIdAndRolAndEstadoInscripcion(
                            tarea.getConvocatoria().getId(), Rol.DOCENTE, EstadoInscripcion.ACEPTADO);
            for (ConvocatoriaParticipante docPart : docentes) {
                notificacionService.crearNotificacion(
                        docPart.getUsuario().getId(),
                        Notificacion.NUEVA_ENTREGA,
                        "Nueva entrega recibida",
                        estudiante.getNombreCompleto() + " realizó una entrega en '" + tarea.getTitulo() +
                                (codigoEquipo != null ? " — " + codigoEquipo : "") + "'.",
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

        boolean gestor = puedeDocenteGestionarTarea(tarea.getConvocatoria(), user);
        if (!gestor && user.getRol() != Rol.JURADO) {
            throw new AccessDeniedException("Solo el docente a cargo o el jurado puede ver las entregas de esta tarea.");
        }

        List<EntregaTarea> entregas = entregaRepository.findByTareaOrderByFechaEntregaDesc(tarea);
        if (!gestor) entregas = entregas.stream()
                .filter(e -> juradoAsignacionService.puedeRevisar(user, e)).toList();
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
        if (!esAdmin && !esDocente && !juradoAsignacionService.puedeRevisar(evaluador, entrega)) {
            throw new AccessDeniedException("Esta entrega no pertenece a los proyectos asignados al jurado.");
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

        // Si la tarea es grupal y tiene grupo asociado, propagar la calificación y rúbrica a los compañeros del equipo
        if (entrega.getTarea().isEsGrupal() && entrega.getGrupo() != null) {
            List<EntregaTarea> entregasGrupo = entregaRepository.findByTareaAndGrupo(entrega.getTarea(), entrega.getGrupo());
            List<EntregaPuntajeCriterio> puntajesSaved = puntajeCriterioRepository.findByEntrega(saved);

            for (EntregaTarea eComp : entregasGrupo) {
                if (!eComp.getId().equals(saved.getId())) {
                    eComp.setCalificacion(saved.getCalificacion());
                    eComp.setRetroalimentacion(request.getRetroalimentacion());
                    eComp.setFechaCalificacion(LocalDateTime.now(ZONA_FICCT));
                    eComp.setCalificadoPor(evaluador);
                    eComp.setEstado(EstadoEntrega.CALIFICADO);
                    EntregaTarea compGuardada = entregaRepository.save(eComp);

                    // Replicar desglose de criterios pedagógicos
                    if (puntajesSaved != null && !puntajesSaved.isEmpty()) {
                        puntajeCriterioRepository.deleteByEntrega(compGuardada);
                        for (EntregaPuntajeCriterio epc : puntajesSaved) {
                            puntajeCriterioRepository.save(new EntregaPuntajeCriterio(compGuardada, epc.getCriterio(), epc.getPuntaje()));
                        }
                    }

                    // Notificar a cada compañero de equipo
                    try {
                        notificacionService.crearNotificacion(
                                compGuardada.getEstudiante().getId(),
                                Notificacion.ENTREGA_CALIFICADA,
                                "Tu entrega grupal fue calificada",
                                "La entrega del equipo '" + (compGuardada.getNombreEquipo() != null ? compGuardada.getNombreEquipo() : "Grupal") + "' en '" + tarea.getTitulo() + "' recibió " + saved.getCalificacion() + " pts.",
                                conv.getId(),
                                tarea.getId(),
                                compGuardada.getId()
                        );
                    } catch (Exception e) {
                        // Silencioso
                    }
                }
            }
        }

        if (entrega.getFeriaPostulacion() != null) {
            FeriaPostulacion equipo = entrega.getFeriaPostulacion();
            for (FeriaIntegrante integrante : equipo.getIntegrantes()) {
                userRepository.findByEmail(integrante.getCorreo()).ifPresent(miembro -> {
                    try {
                        notificacionService.crearNotificacion(miembro.getId(),
                                Notificacion.ENTREGA_CALIFICADA,
                                "Entrega calificada — " + equipo.getCodigoEquipo(),
                                "La entrega '" + tarea.getTitulo() + "' del equipo " + equipo.getCodigoEquipo() +
                                        " recibió " + saved.getCalificacion() + " pts.",
                                conv.getId(), tarea.getId(), saved.getId());
                    } catch (Exception ignored) { }
                });
            }
            return toEntregaDTO(saved, evaluador);
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
    public List<MejorasDTOs.PendienteTarea> getPendientes(Long tareaId, String userEmail) {
        User usuario = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        Convocatoria convocatoria = tarea.getConvocatoria();
        if (!puedeDocenteGestionarTarea(convocatoria, usuario)) {
            throw new AccessDeniedException("Solo el docente a cargo o el administrador puede consultar pendientes.");
        }

        List<EntregaTarea> entregas = entregaRepository.findByTareaOrderByFechaEntregaDesc(tarea);
        List<MejorasDTOs.PendienteTarea> pendientes = new ArrayList<>();

        if (tarea.isEsGrupal() && tarea.isPlantillaFeria()) {
            Set<Long> equiposEntregados = entregas.stream()
                    .filter(e -> e.getFeriaPostulacion() != null)
                    .map(e -> e.getFeriaPostulacion().getId())
                    .collect(Collectors.toSet());
            for (FeriaPostulacion equipo : feriaPostulacionRepository.findByConvocatoriaIdOrderByIdAsc(convocatoria.getId())) {
                if (equipo.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO || equiposEntregados.contains(equipo.getId())) continue;
                FeriaIntegrante jefe = equipo.getIntegrantes().stream()
                        .filter(i -> i.getCorreo().equalsIgnoreCase(equipo.getParticipante().getUsuario().getEmail()))
                        .findFirst().orElse(null);
                pendientes.add(new MejorasDTOs.PendienteTarea("GRUPO", equipo.getId(), equipo.getCodigoEquipo(),
                        equipo.getTema(), jefe != null ? jefe.getNombre() : equipo.getParticipante().getUsuario().getNombreCompleto(),
                        jefe != null ? jefe.getCelular() : equipo.getParticipante().getUsuario().getCelular()));
            }
        } else if (tarea.isEsGrupal()) {
            Set<Long> gruposEntregados = entregas.stream()
                    .filter(e -> e.getGrupo() != null)
                    .map(e -> e.getGrupo().getId())
                    .collect(Collectors.toSet());
            Set<String> nombresEntregados = entregas.stream()
                    .map(EntregaTarea::getNombreEquipo)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            for (Grupo grupo : grupoRepository.findByConvocatoriaIdOrderByNombreAsc(convocatoria.getId())) {
                List<ConvocatoriaParticipante> miembros = participanteRepository.findMiembrosPorGrupoId(grupo.getId());
                if (miembros.isEmpty()) miembros = participanteRepository.findByGrupoId(grupo.getId());
                miembros = miembros.stream()
                        .filter(p -> p.getRol() == Rol.ESTUDIANTE && p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                        .sorted(Comparator.comparing(ConvocatoriaParticipante::getId)).toList();
                if (miembros.isEmpty() || gruposEntregados.contains(grupo.getId()) || nombresEntregados.contains(grupo.getNombre())) continue;
                User responsable = miembros.stream()
                        .map(ConvocatoriaParticipante::getUsuario)
                        .filter(u -> grupo.getCreadoPor() != null && u.getId().equals(grupo.getCreadoPor().getId()))
                        .findFirst().orElse(miembros.get(0).getUsuario());
                pendientes.add(new MejorasDTOs.PendienteTarea("GRUPO", grupo.getId(), grupo.getNombre(),
                        grupo.getDescripcion(), responsable.getNombreCompleto(), responsable.getCelular()));
            }
        } else {
            Set<Long> estudiantesEntregados = entregas.stream()
                    .map(e -> e.getEstudiante().getId())
                    .collect(Collectors.toSet());
            for (ConvocatoriaParticipante participante : participanteRepository.findByConvocatoriaIdAndRolAndEstadoInscripcion(
                    convocatoria.getId(), Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO)) {
                User estudiante = participante.getUsuario();
                if (estudiantesEntregados.contains(estudiante.getId())) continue;
                pendientes.add(new MejorasDTOs.PendienteTarea("PERSONA", estudiante.getId(), null, null,
                        estudiante.getNombreCompleto(), estudiante.getCelular()));
            }
            pendientes.sort(Comparator.comparing(MejorasDTOs.PendienteTarea::destinatario, String.CASE_INSENSITIVE_ORDER));
        }
        return pendientes;
    }

    @Transactional(readOnly = true)
    public MejorasDTOs.SeguimientoTarea getSeguimiento(Long tareaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        Convocatoria conv = tarea.getConvocatoria();
        if (!puedeDocenteGestionarTarea(conv, user)) {
            throw new AccessDeniedException("Solo docentes o administradores de esta área pueden consultar el seguimiento.");
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
        if (user.getRol() != Rol.ESTUDIANTE) {
            throw new AccessDeniedException("Solo los estudiantes tienen tareas pendientes.");
        }
        List<ConvocatoriaParticipante> misAreas = participanteRepository
                .findByUsuarioIdAndEstadoInscripcion(user.getId(), EstadoInscripcion.ACEPTADO);

        List<TareaDTO> resultado = new ArrayList<>();
        for (ConvocatoriaParticipante part : misAreas) {
            Long convId = part.getConvocatoria().getId();
            List<Tarea> tareas = tareaRepository.findByConvocatoriaIdAndHabilitadaTrueOrderByFechaEntregaAsc(convId);
            List<FeriaPostulacion> equipos = equiposAceptados(convId, user);
            for (Tarea t : tareas) {
                if (!t.isVisibleParaEstudiantes()) continue;
                if (t.isPlantillaFeria()) {
                    for (FeriaPostulacion equipo : equipos) resultado.add(toDTO(t, user, equipo));
                } else {
                    resultado.add(toDTO(t, user));
                }
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
        boolean esDocenteOJurado = puedeDocenteGestionarTarea(entrega.getTarea().getConvocatoria(), user)
                || (user.getRol() == Rol.JURADO && juradoAsignacionService.puedeRevisar(user, entrega));

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

        if (!puedeDocenteGestionarTarea(tarea.getConvocatoria(), user)) {
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

        if (!puedeDocenteGestionarTarea(conv, user)) {
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
        return toDTO(tarea, currentUser, null);
    }

    private TareaDTO toDTO(Tarea tarea, User currentUser, FeriaPostulacion equipoFeria) {
        TareaDTO dto = new TareaDTO();
        dto.setId(tarea.getId());
        dto.setConvocatoriaId(tarea.getConvocatoria().getId());
        dto.setConvocatoriaTitulo(tarea.getConvocatoria().getTitulo());
        dto.setTitulo(tarea.getTitulo());
        if (equipoFeria != null) {
            dto.setFeriaPostulacionId(equipoFeria.getId());
            dto.setCodigoEquipo(equipoFeria.getCodigoEquipo());
            dto.setTitulo(tarea.getTitulo() + " — " + equipoFeria.getCodigoEquipo());
        }
        dto.setDescripcion(tarea.getDescripcion());
        dto.setAdjuntos(tarea.getAdjuntos().stream()
                .map(a -> new AdjuntoTareaDTO(a.getNombre(), a.getRuta(), a.getTamanoBytes()))
                .toList());
        dto.setFechaHabilitacion(tarea.getFechaHabilitacion());
        dto.setFechaEntrega(tarea.getFechaEntrega());
        dto.setFechaCorte(tarea.getFechaCorte());
        dto.setFechaLimite(tarea.getFechaLimite());
        dto.setHabilitada(tarea.isHabilitada());
        dto.setVisibleJurados(tarea.isVisibleJurados());
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

        dto.setEsGrupal(tarea.isEsGrupal() || tarea.isPlantillaFeria());
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
            if (equipoFeria != null) {
                entregaRepository.findByTareaAndFeriaPostulacion(tarea, equipoFeria)
                        .ifPresent(entrega -> dto.setMiEntrega(toEntregaDTO(entrega, currentUser)));
                dto.setMiEstado(dto.getMiEntrega() == null ? "PENDIENTE" :
                        dto.getMiEntrega().getEstado() == EstadoEntrega.CALIFICADO ? "CALIFICADO" : "ENTREGADO");
                return dto;
            }
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
                    miGrupo = (part.getGrupos() != null && !part.getGrupos().isEmpty()) ? part.getGrupos().get(0) : part.getGrupo();
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

        dto.setEsGrupal(entrega.getFeriaPostulacion() != null ||
                (entrega.getTarea() != null && entrega.getTarea().isEsGrupal()));

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
        if (entrega.getFeriaPostulacion() != null) {
            FeriaPostulacion equipo = entrega.getFeriaPostulacion();
            dto.setGrupoNombre(equipo.getCodigoEquipo());
            dto.setCompanerosEquipo(equipo.getIntegrantes().stream()
                    .map(FeriaIntegrante::getNombre).toList());
        } else if (entrega.getGrupo() != null) {
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

    @Transactional
    public void eliminarTarea(Long tareaId, boolean forzar, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        if (!puedeDocenteGestionarTarea(tarea.getConvocatoria(), user)) {
            throw new AccessDeniedException("Solo un Docente asignado a esta área o un Administrador puede eliminar tareas.");
        }

        int totalEntregas = tarea.getEntregas() != null ? tarea.getEntregas().size() : 0;
        if (totalEntregas > 0 && !forzar) {
            throw new TareaConEntregasException(
                    "La tarea cuenta con " + totalEntregas + " entrega(s) registrada(s). Requiere confirmación para eliminarla definitivamente.",
                    totalEntregas
            );
        }

        // Limpiar entregas y sus versiones/criterios
        if (tarea.getEntregas() != null && !tarea.getEntregas().isEmpty()) {
            for (EntregaTarea entrega : tarea.getEntregas()) {
                puntajeCriterioRepository.deleteByEntrega(entrega);
                entregaVersionRepository.deleteByEntrega(entrega);
            }
            entregaRepository.deleteAll(tarea.getEntregas());
            tarea.getEntregas().clear();
        }

        // Limpiar rúbrica
        if (tarea.getRubrica() != null && !tarea.getRubrica().isEmpty()) {
            rubricaCriterioRepository.deleteByTarea(tarea);
            tarea.getRubrica().clear();
        }

        tareaRepository.delete(tarea);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no autenticado"));
    }
}
