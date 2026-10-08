package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.ColaboradorRequest;
import com.ficct.investigacion.dto.DocumentoColaboradorDTO;
import com.ficct.investigacion.dto.DocumentoDTO;
import com.ficct.investigacion.dto.DocumentoRequest;
import com.ficct.investigacion.dto.DocumentoVersionDTO;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.ConvocatoriaRepository;
import com.ficct.investigacion.repository.DocumentoColaboradorRepository;
import com.ficct.investigacion.repository.DocumentoRepository;
import com.ficct.investigacion.repository.DocumentoVersionRepository;
import com.ficct.investigacion.repository.ConvocatoriaParticipanteRepository;
import com.ficct.investigacion.repository.TareaRepository;
import com.ficct.investigacion.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class DocumentoService {

    private final DocumentoRepository documentoRepository;
    private final DocumentoColaboradorRepository colaboradorRepository;
    private final UserRepository userRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final TareaRepository tareaRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final DocumentoVersionRepository versionRepository;
    private final DocumentoLiveVersionService liveVersionService;

    public DocumentoService(DocumentoRepository documentoRepository,
                            DocumentoColaboradorRepository colaboradorRepository,
                            UserRepository userRepository,
                            ConvocatoriaRepository convocatoriaRepository,
                            TareaRepository tareaRepository,
                            ConvocatoriaParticipanteRepository participanteRepository,
                            SimpMessagingTemplate messagingTemplate,
                            DocumentoVersionRepository versionRepository,
                            DocumentoLiveVersionService liveVersionService) {
        this.documentoRepository = documentoRepository;
        this.colaboradorRepository = colaboradorRepository;
        this.userRepository = userRepository;
        this.convocatoriaRepository = convocatoriaRepository;
        this.tareaRepository = tareaRepository;
        this.participanteRepository = participanteRepository;
        this.messagingTemplate = messagingTemplate;
        this.versionRepository = versionRepository;
        this.liveVersionService = liveVersionService;
    }

    public DocumentoDTO crear(DocumentoRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);

        Convocatoria conv = null;
        if (request.getConvocatoriaId() != null) {
            conv = convocatoriaRepository.findById(request.getConvocatoriaId()).orElse(null);
        }

        Documento doc = new Documento(
                request.getTitulo(),
                request.getDescripcion(),
                request.getCategoria(),
                request.getContenido(),
                user,
                conv
        );

        Documento saved = documentoRepository.save(doc);
        registrarVersionSiCorresponde(saved, user);
        notificarActualizacion(saved, user);
        return toDTO(saved, user);
    }

    public List<DocumentoVersionDTO> listarVersiones(Long documentoId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Documento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado con ID: " + documentoId));
        String permiso = resolverPermiso(doc, user);
        if (permiso == null) {
            throw new AccessDeniedException("No tiene permisos para acceder a este documento.");
        }
        return versionRepository.findTop30ByDocumentoOrderByCreatedAtDesc(doc).stream()
                .map(this::toVersionDTO)
                .collect(Collectors.toList());
    }

    public DocumentoDTO restaurarVersion(Long documentoId, Long versionId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Documento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado con ID: " + documentoId));
        String permiso = resolverPermiso(doc, user);
        if (permiso == null || "LECTURA".equals(permiso)) {
            throw new AccessDeniedException("No tiene permisos de edicion en este documento.");
        }
        DocumentoVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("Version no encontrada"));
        if (!version.getDocumento().getId().equals(documentoId)) {
            throw new IllegalArgumentException("La version no pertenece a este documento");
        }
        doc.setTitulo(version.getTitulo());
        doc.setContenido(version.getContenido());
        Documento saved = documentoRepository.save(doc);
        versionRepository.save(new DocumentoVersion(saved, user, saved.getTitulo(), saved.getContenido()));
        notificarActualizacion(saved, user);
        return toDTO(saved, user);
    }

    @Transactional(readOnly = true)
    public List<DocumentoDTO> listarAccesibles(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<Documento> docs;
        if (user.getRol() == Rol.ADMIN) {
            docs = documentoRepository.findAll();
        } else {
            docs = documentoRepository.findAccessibleByUser(user);
        }
        return docs.stream().map(d -> toDTO(d, user)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DocumentoDTO obtenerPorId(Long id, String userEmail) {
        User user = getUserByEmail(userEmail);
        Documento doc = documentoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado con ID: " + id));

        String permiso = resolverPermiso(doc, user);
        if (permiso == null) {
            throw new AccessDeniedException("No tiene permisos para acceder a este documento.");
        }

        return toDTO(doc, user);
    }

    public DocumentoDTO actualizar(Long id, DocumentoRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        Documento doc = documentoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado con ID: " + id));

        String permiso = resolverPermiso(doc, user);
        if (permiso == null || "LECTURA".equals(permiso)) {
            throw new AccessDeniedException("No tiene permisos de edicion en este documento. Su nivel es solo lectura.");
        }

        if (request.getTitulo() != null && !request.getTitulo().isBlank()) {
            doc.setTitulo(request.getTitulo());
        }
        if (request.getDescripcion() != null) {
            doc.setDescripcion(request.getDescripcion());
        }
        if (request.getCategoria() != null) {
            doc.setCategoria(request.getCategoria());
        }
        if (request.getContenido() != null) {
            doc.setContenido(request.getContenido());
        }
        if (request.getConvocatoriaId() != null) {
            Convocatoria conv = convocatoriaRepository.findById(request.getConvocatoriaId()).orElse(null);
            doc.setConvocatoria(conv);
        }

        Documento saved = documentoRepository.save(doc);
        notificarActualizacion(saved, user);
        return toDTO(saved, user);
    }

    public void eliminar(Long id, String userEmail) {
        User user = getUserByEmail(userEmail);
        Documento doc = documentoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado con ID: " + id));

        if (!doc.getAutor().getId().equals(user.getId()) && user.getRol() != Rol.ADMIN) {
            throw new AccessDeniedException("Solo el autor original o un Administrador puede eliminar este documento.");
        }

        documentoRepository.delete(doc);
    }

    public DocumentoDTO asignarColaborador(Long documentoId, ColaboradorRequest request, String userEmail) {
        User currentUser = getUserByEmail(userEmail);
        Documento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado con ID: " + documentoId));

        String permisoActual = resolverPermiso(doc, currentUser);
        if (!"OWNER".equals(permisoActual) && !"ADMINISTRACION".equals(permisoActual) && currentUser.getRol() != Rol.ADMIN) {
            throw new AccessDeniedException("Solo el autor o un colaborador con rol ADMINISTRACION puede gestionar permisos.");
        }

        User colaboradorUser = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con correo: " + request.getEmail()));

        if (colaboradorUser.getId().equals(doc.getAutor().getId())) {
            throw new IllegalArgumentException("El autor original ya posee administracion total del documento.");
        }

        Optional<DocumentoColaborador> existente = colaboradorRepository.findByDocumentoAndUsuario(doc, colaboradorUser);
        if (existente.isPresent()) {
            DocumentoColaborador colab = existente.get();
            colab.setPermiso(request.getPermiso());
            colaboradorRepository.save(colab);
        } else {
            DocumentoColaborador nuevo = new DocumentoColaborador(doc, colaboradorUser, request.getPermiso());
            doc.addColaborador(nuevo);
            colaboradorRepository.save(nuevo);
        }

        return toDTO(doc, currentUser);
    }

    public DocumentoDTO removerColaborador(Long documentoId, Long colaboradorId, String userEmail) {
        User currentUser = getUserByEmail(userEmail);
        Documento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado con ID: " + documentoId));

        String permisoActual = resolverPermiso(doc, currentUser);
        if (!"OWNER".equals(permisoActual) && !"ADMINISTRACION".equals(permisoActual) && currentUser.getRol() != Rol.ADMIN) {
            throw new AccessDeniedException("Solo el autor o un administrador puede remover colaboradores.");
        }

        DocumentoColaborador colab = colaboradorRepository.findById(colaboradorId)
                .orElseThrow(() -> new IllegalArgumentException("Colaborador no encontrado con ID: " + colaboradorId));

        doc.removeColaborador(colab);
        colaboradorRepository.delete(colab);

        return toDTO(doc, currentUser);
    }

    public String resolverPermiso(Documento doc, User user) {
        if (user.getRol() == Rol.ADMIN) {
            return "OWNER";
        }
        Optional<Tarea> tareaVinculada = tareaRepository.findByDocumentoColaborativoId(doc.getId());
        if (tareaVinculada.isPresent()) {
            return resolverPermisoDocumentoDeTarea(tareaVinculada.get(), user);
        }
        if (doc.getAutor().getId().equals(user.getId())) {
            return "OWNER";
        }
        for (DocumentoColaborador c : doc.getColaboradores()) {
            if (c.getUsuario().getId().equals(user.getId())) {
                return c.getPermiso().name();
            }
        }
        return null; // Sin acceso
    }

    private DocumentoDTO toDTO(Documento doc, User currentUser) {
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

        if (doc.getConvocatoria() != null) {
            dto.setConvocatoriaId(doc.getConvocatoria().getId());
            dto.setConvocatoriaTitulo(doc.getConvocatoria().getTitulo());
        }
        tareaRepository.findByDocumentoColaborativoId(doc.getId()).ifPresent(t -> {
            dto.setTareaId(t.getId());
            dto.setTareaTitulo(t.getTitulo());
        });

        dto.setMiPermiso(resolverPermiso(doc, currentUser));
        dto.setCreatedAt(doc.getCreatedAt());
        dto.setUpdatedAt(doc.getUpdatedAt());

        List<DocumentoColaboradorDTO> colabs = doc.getColaboradores().stream().map(c ->
                new DocumentoColaboradorDTO(
                        c.getId(),
                        c.getUsuario().getId(),
                        c.getUsuario().getNombreCompleto(),
                        c.getUsuario().getEmail(),
                        c.getPermiso(),
                        c.getFechaAsignacion()
                )
        ).collect(Collectors.toList());
        dto.setColaboradores(colabs);

        return dto;
    }

    private DocumentoVersionDTO toVersionDTO(DocumentoVersion version) {
        DocumentoVersionDTO dto = new DocumentoVersionDTO();
        dto.setId(version.getId());
        dto.setDocumentoId(version.getDocumento().getId());
        dto.setTitulo(version.getTitulo());
        dto.setContenido(version.getContenido());
        dto.setUsuarioId(version.getUsuario().getId());
        dto.setUsuarioNombre(version.getUsuario().getNombreCompleto());
        dto.setCreatedAt(version.getCreatedAt());
        return dto;
    }

    private void registrarVersionSiCorresponde(Documento doc, User user) {
        Optional<DocumentoVersion> ultima = versionRepository.findFirstByDocumentoOrderByCreatedAtDesc(doc);
        if (ultima.isPresent()) {
            DocumentoVersion version = ultima.get();
            boolean mismoContenido = java.util.Objects.equals(version.getContenido(), doc.getContenido())
                    && java.util.Objects.equals(version.getTitulo(), doc.getTitulo());
            boolean muyReciente = version.getCreatedAt() != null
                    && Duration.between(version.getCreatedAt(), java.time.LocalDateTime.now()).toSeconds() < 90;
            if (mismoContenido || muyReciente) {
                return;
            }
        }
        versionRepository.save(new DocumentoVersion(doc, user, doc.getTitulo(), doc.getContenido()));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no autenticado"));
    }

    private String resolverPermisoDocumentoDeTarea(Tarea tarea, User user) {
        if (puedeDocenteVerDocumentoDeTarea(tarea, user)) {
            return "LECTURA";
        }
        return estudiantePerteneceAGrupoDeTarea(tarea, user) ? "EDICION" : null;
    }

    private boolean puedeDocenteVerDocumentoDeTarea(Tarea tarea, User user) {
        if (tarea.getCreador() != null && tarea.getCreador().getId().equals(user.getId())) {
            return true;
        }
        return participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRolAndEstadoInscripcion(
                tarea.getConvocatoria().getId(),
                user.getId(),
                Rol.DOCENTE,
                EstadoInscripcion.ACEPTADO
        );
    }

    private boolean estudiantePerteneceAGrupoDeTarea(Tarea tarea, User user) {
        if (user.getRol() != Rol.ESTUDIANTE || !tarea.isEsGrupal() || tarea.getActividadGrupo() == null) {
            return false;
        }
        Optional<ConvocatoriaParticipante> participanteOpt = participanteRepository
                .findByConvocatoriaIdAndUsuarioId(tarea.getConvocatoria().getId(), user.getId());
        if (participanteOpt.isEmpty()) {
            return false;
        }
        ConvocatoriaParticipante participante = participanteOpt.get();
        if (participante.getRol() != Rol.ESTUDIANTE || participante.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) {
            return false;
        }
        Long actividadId = tarea.getActividadGrupo().getId();
        boolean enGrupoDeActividad = participante.getGrupos() != null && participante.getGrupos().stream()
                .anyMatch(g -> g.getActividadGrupo() != null && actividadId.equals(g.getActividadGrupo().getId()));
        if (enGrupoDeActividad) {
            return true;
        }
        Grupo grupoPrincipal = participante.getGrupo();
        return grupoPrincipal != null
                && grupoPrincipal.getActividadGrupo() != null
                && actividadId.equals(grupoPrincipal.getActividadGrupo().getId());
    }

    private void notificarActualizacion(Documento doc, User user) {
        try {
            long liveVersion = liveVersionService.markPersistedChange(doc.getId());
            messagingTemplate.convertAndSend(
                    "/topic/documentos/" + doc.getId(),
                    java.util.Map.of(
                            "documentoId", doc.getId(),
                            "updatedAt", doc.getUpdatedAt() != null ? doc.getUpdatedAt().toString() : "",
                            "usuario", user.getNombreCompleto(),
                            "serverVersion", liveVersion
                    )
            );
        } catch (Exception ignored) {
            // La persistencia del documento no depende del canal WebSocket.
        }
    }
}
