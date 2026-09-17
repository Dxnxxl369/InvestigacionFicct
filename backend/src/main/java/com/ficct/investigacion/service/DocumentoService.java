package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.ColaboradorRequest;
import com.ficct.investigacion.dto.DocumentoColaboradorDTO;
import com.ficct.investigacion.dto.DocumentoDTO;
import com.ficct.investigacion.dto.DocumentoRequest;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.ConvocatoriaRepository;
import com.ficct.investigacion.repository.DocumentoColaboradorRepository;
import com.ficct.investigacion.repository.DocumentoRepository;
import com.ficct.investigacion.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public DocumentoService(DocumentoRepository documentoRepository,
                            DocumentoColaboradorRepository colaboradorRepository,
                            UserRepository userRepository,
                            ConvocatoriaRepository convocatoriaRepository) {
        this.documentoRepository = documentoRepository;
        this.colaboradorRepository = colaboradorRepository;
        this.userRepository = userRepository;
        this.convocatoriaRepository = convocatoriaRepository;
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

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no autenticado"));
    }
}
