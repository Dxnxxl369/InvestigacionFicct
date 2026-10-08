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
    private final ModuloRepository moduloRepository;

    public TareaService(TareaRepository tareaRepository,
                        EntregaTareaRepository entregaRepository,
                        ConvocatoriaRepository convocatoriaRepository,
                        ConvocatoriaParticipanteRepository participanteRepository,
                        DocumentoRepository documentoRepository,
                        UserRepository userRepository,
                        ModuloRepository moduloRepository) {
        this.tareaRepository = tareaRepository;
        this.entregaRepository = entregaRepository;
        this.convocatoriaRepository = convocatoriaRepository;
        this.participanteRepository = participanteRepository;
        this.documentoRepository = documentoRepository;
        this.userRepository = userRepository;
        this.moduloRepository = moduloRepository;
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

        if (request.getModuloId() != null && request.getModuloId() > 0) {
            moduloRepository.findById(request.getModuloId()).ifPresent(tarea::setModulo);
        }

        if (Boolean.TRUE.equals(request.getDocumentoColaborativoHabilitado())) {
            tarea.setDocumentoColaborativoHabilitado(true);
            tarea.setDocumentoColaborativo(crearDocumentoColaborativoParaTarea(tarea, user));
        }

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
        if (request.getModuloId() != null) {
            if (request.getModuloId() > 0) {
                moduloRepository.findById(request.getModuloId()).ifPresent(tarea::setModulo);
            } else {
                tarea.setModulo(null);
            }
        }
        if (request.getDocumentoColaborativoHabilitado() != null) {
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

    public DocumentoDTO obtenerDocumentoColaborativo(Long tareaId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Tarea tarea = tareaRepository.findById(tareaId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada con ID: " + tareaId));

        if (!tarea.isDocumentoColaborativoHabilitado()) {
            throw new IllegalStateException("Esta actividad no tiene documento colaborativo habilitado.");
        }

        if (!puedeAccederActividad(tarea, user)) {
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

    private boolean puedeAccederActividad(Tarea tarea, User user) {
        if (user.getRol() == Rol.ADMIN) return true;
        if (puedeDocenteGestionarTarea(tarea.getConvocatoria(), user)) return true;
        return participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndEstadoInscripcion(
                tarea.getConvocatoria().getId(), user.getId(), EstadoInscripcion.ACEPTADO
        );
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
        dto.setMiPermiso("EDICION");
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
