package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class TareaService {

    private final TareaRepository tareaRepository;
    private final EntregaTareaRepository entregaRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final DocumentoRepository documentoRepository;
    private final UserRepository userRepository;

    public TareaService(TareaRepository tareaRepository,
                        EntregaTareaRepository entregaRepository,
                        ConvocatoriaRepository convocatoriaRepository,
                        ConvocatoriaParticipanteRepository participanteRepository,
                        DocumentoRepository documentoRepository,
                        UserRepository userRepository) {
        this.tareaRepository = tareaRepository;
        this.entregaRepository = entregaRepository;
        this.convocatoriaRepository = convocatoriaRepository;
        this.participanteRepository = participanteRepository;
        this.documentoRepository = documentoRepository;
        this.userRepository = userRepository;
    }

    private boolean puedeDocenteGestionarTarea(Convocatoria convocatoria, User user) {
        if (user.getRol() == Rol.ADMIN) {
            return true;
        }
        if (user.getRol() == Rol.DOCENTE) {
            return participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRol(
                    convocatoria.getId(), user.getId(), Rol.DOCENTE);
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

        LocalDateTime fechaHab = request.getFechaHabilitacion() != null ? request.getFechaHabilitacion() : LocalDateTime.now();
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

        Tarea saved = tareaRepository.save(tarea);
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
        if (request.getFechaCorte() != null) {
            tarea.setFechaCorte(request.getFechaCorte());
        }
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

        // 1. Control manual de habilitación
        if (!tarea.isHabilitada()) {
            throw new IllegalStateException("La recepción de entregas para esta tarea ha sido deshabilitada por el docente.");
        }

        // 2. Control de triple fecha (Moodle)
        LocalDateTime ahora = LocalDateTime.now();
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

        Optional<EntregaTarea> existente = entregaRepository.findByTareaAndEstudiante(tarea, estudiante);
        EntregaTarea entrega;
        if (existente.isPresent()) {
            entrega = existente.get();
            entrega.setDocumento(doc);
            if (request.getNombreArchivo() != null) entrega.setNombreArchivo(request.getNombreArchivo());
            if (request.getArchivoUrl() != null) entrega.setArchivoUrl(request.getArchivoUrl());
            entrega.setComentarioEstudiante(request.getComentarioEstudiante());
            entrega.setFechaEntrega(LocalDateTime.now());
            entrega.setEstado(EstadoEntrega.ENTREGADO);
        } else {
            entrega = new EntregaTarea(
                    tarea,
                    estudiante,
                    doc,
                    request.getNombreArchivo(),
                    request.getArchivoUrl(),
                    request.getComentarioEstudiante()
            );
        }

        EntregaTarea saved = entregaRepository.save(entrega);
        return toEntregaDTO(saved);
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
        return entregas.stream().map(this::toEntregaDTO).collect(Collectors.toList());
    }

    public EntregaTareaDTO calificarEntrega(Long entregaId, CalificarEntregaRequest request, String userEmail) {
        User evaluador = getUserByEmail(userEmail);
        EntregaTarea entrega = entregaRepository.findById(entregaId)
                .orElseThrow(() -> new IllegalArgumentException("Entrega no encontrada con ID: " + entregaId));

        Convocatoria conv = entrega.getTarea().getConvocatoria();
        boolean esAdmin = evaluador.getRol() == Rol.ADMIN;
        boolean esDocente = participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRol(conv.getId(), evaluador.getId(), Rol.DOCENTE);
        boolean esJurado = participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRol(conv.getId(), evaluador.getId(), Rol.JURADO);

        if (!esAdmin && !esDocente && !esJurado) {
            throw new AccessDeniedException("Solo los docentes o jurados asignados a esta área pueden calificar entregas.");
        }

        entrega.setCalificacion(request.getCalificacion());
        entrega.setRetroalimentacion(request.getRetroalimentacion());
        entrega.setFechaCalificacion(LocalDateTime.now());
        entrega.setCalificadoPor(evaluador);
        entrega.setEstado(EstadoEntrega.CALIFICADO);

        EntregaTarea saved = entregaRepository.save(entrega);
        return toEntregaDTO(saved);
    }

    private void validarExtensionArchivo(String nombreArchivo, String permitidos) {
        if (permitidos == null || permitidos.isBlank() || "*".equals(permitidos.trim())) {
            return;
        }
        int lastDot = nombreArchivo.lastIndexOf('.');
        if (lastDot == -1) {
            throw new IllegalArgumentException("El archivo debe tener una extensión válida.");
        }
        String ext = nombreArchivo.substring(lastDot).toLowerCase().trim();
        List<String> permitidas = Arrays.stream(permitidos.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .collect(Collectors.toList());

        boolean valida = permitidas.stream().anyMatch(p -> p.equalsIgnoreCase(ext) || p.equalsIgnoreCase(ext.replace(".", "")));
        if (!valida) {
            throw new IllegalArgumentException("Tipo de archivo no permitido. Se admiten únicamente: " + permitidos);
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
        dto.setTotalEntregas(tarea.getEntregas().size());
        dto.setCreatedAt(tarea.getCreatedAt());

        // Estado Moodle computado
        LocalDateTime ahora = LocalDateTime.now();
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

        if (currentUser.getRol() == Rol.ESTUDIANTE) {
            entregaRepository.findByTareaAndEstudiante(tarea, currentUser)
                    .ifPresent(e -> dto.setMiEntrega(toEntregaDTO(e)));
        }

        return dto;
    }

    private EntregaTareaDTO toEntregaDTO(EntregaTarea entrega) {
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

        return dto;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no autenticado"));
    }
}
