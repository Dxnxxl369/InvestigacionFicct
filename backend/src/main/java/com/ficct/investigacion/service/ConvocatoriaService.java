package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.ConvocatoriaParticipanteDTO;
import com.ficct.investigacion.dto.ConvocatoriaRequest;
import com.ficct.investigacion.dto.DesignarParticipanteRequest;
import com.ficct.investigacion.dto.InscribirseAreaRequest;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.ConvocatoriaParticipanteRepository;
import com.ficct.investigacion.repository.ConvocatoriaRepository;
import com.ficct.investigacion.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ConvocatoriaService {

    private final ConvocatoriaRepository convocatoriaRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final UserRepository userRepository;

    public ConvocatoriaService(ConvocatoriaRepository convocatoriaRepository,
                               ConvocatoriaParticipanteRepository participanteRepository,
                               UserRepository userRepository) {
        this.convocatoriaRepository = convocatoriaRepository;
        this.participanteRepository = participanteRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ConvocatoriaDTO crearConvocatoria(ConvocatoriaRequest request, String userEmail) {
        User creador = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con correo: " + userEmail));

        Convocatoria c = new Convocatoria(
                request.getTitulo().trim(),
                request.getDescripcion().trim(),
                request.getTipo() != null ? request.getTipo() : TipoConvocatoria.FERIA,
                EstadoConvocatoria.BORRADOR,
                request.getFechaCierre(),
                request.getTamanoEquipo(),
                request.getImagenPortada(),
                creador
        );

        if (request.getRequisitos() != null) {
            for (String reqStr : request.getRequisitos()) {
                if (reqStr != null && !reqStr.trim().isEmpty()) {
                    c.addRequisito(new Requisito(reqStr.trim(), c));
                }
            }
        }

        Convocatoria saved = convocatoriaRepository.save(c);
        return new ConvocatoriaDTO(saved);
    }

    @Transactional
    public ConvocatoriaDTO actualizarConvocatoria(Long id, ConvocatoriaRequest request, String userEmail) {
        Convocatoria c = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada con ID: " + id));

        c.setTitulo(request.getTitulo().trim());
        c.setDescripcion(request.getDescripcion().trim());
        if (request.getTipo() != null) c.setTipo(request.getTipo());
        c.setFechaCierre(request.getFechaCierre());
        c.setTamanoEquipo(request.getTamanoEquipo());
        c.setImagenPortada(request.getImagenPortada());

        c.clearRequisitos();
        if (request.getRequisitos() != null) {
            for (String reqStr : request.getRequisitos()) {
                if (reqStr != null && !reqStr.trim().isEmpty()) {
                    c.addRequisito(new Requisito(reqStr.trim(), c));
                }
            }
        }

        Convocatoria updated = convocatoriaRepository.save(c);
        return new ConvocatoriaDTO(updated);
    }

    @Transactional
    public ConvocatoriaDTO publicarConvocatoria(Long id, String userEmail) {
        Convocatoria c = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada con ID: " + id));

        if (c.getTitulo() == null || c.getTitulo().trim().isEmpty()) {
            throw new IllegalStateException("No se puede publicar una convocatoria sin título.");
        }

        c.setEstado(EstadoConvocatoria.PUBLICADA);
        Convocatoria updated = convocatoriaRepository.save(c);
        return new ConvocatoriaDTO(updated);
    }

    @Transactional
    public ConvocatoriaDTO cambiarEstado(Long id, EstadoConvocatoria nuevoEstado) {
        Convocatoria c = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada con ID: " + id));

        c.setEstado(nuevoEstado);
        Convocatoria updated = convocatoriaRepository.save(c);
        return new ConvocatoriaDTO(updated);
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaDTO> listarTodas() {
        return convocatoriaRepository.findAll().stream()
                .map(ConvocatoriaDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaDTO> listarAdmin() {
        return listarTodas();
    }

    @Transactional(readOnly = true)
    public ConvocatoriaDTO obtenerPorId(Long id) {
        Convocatoria c = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada con ID: " + id));
        return new ConvocatoriaDTO(c);
    }

    @Transactional(readOnly = true)
    public ConvocatoriaDTO getById(Long id) {
        return obtenerPorId(id);
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaDTO> listarPublicadas(TipoConvocatoria tipo, String query) {
        List<Convocatoria> list;
        if (query != null && !query.trim().isEmpty()) {
            list = convocatoriaRepository.searchPublicas(EstadoConvocatoria.PUBLICADA, query.trim());
            if (tipo != null) {
                list = list.stream().filter(c -> c.getTipo() == tipo).collect(Collectors.toList());
            }
        } else if (tipo != null) {
            list = convocatoriaRepository.findByTipoAndEstado(tipo, EstadoConvocatoria.PUBLICADA);
        } else {
            list = convocatoriaRepository.findByEstadoOrderByFechaCierreAsc(EstadoConvocatoria.PUBLICADA);
        }
        return list.stream().map(ConvocatoriaDTO::new).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaDTO> listarPublicadas() {
        return listarPublicadas(null, null);
    }

    // ==========================================
    // GESTIÓN DE PARTICIPANTES (DOCENTES, JURADOS, ESTUDIANTES)
    // ==========================================

    @Transactional(readOnly = true)
    public List<ConvocatoriaParticipanteDTO> listarParticipantes(Long convocatoriaId) {
        return participanteRepository.findByConvocatoriaIdOrderByFechaAsignacionAsc(convocatoriaId).stream()
                .map(ConvocatoriaParticipanteDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public ConvocatoriaParticipanteDTO designarParticipante(Long convocatoriaId, DesignarParticipanteRequest request, String solicitanteEmail) {
        User solicitante = userRepository.findByEmail(solicitanteEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario solicitante no encontrado"));
        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + convocatoriaId));

        Rol rolAsignar = request.getRol();
        if (rolAsignar == null) {
            throw new IllegalArgumentException("Debe especificar el rol a designar (DOCENTE o JURADO).");
        }

        // Reglas de autorización de designación:
        // Admin puede designar DOCENTE y JURADO
        // Docente asignado a esta convocatoria puede designar JURADO (incluso hasta el último día)
        boolean esAdmin = solicitante.getRol() == Rol.ADMIN;
        boolean esDocenteAsignado = participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRol(convocatoriaId, solicitante.getId(), Rol.DOCENTE);

        if (rolAsignar == Rol.DOCENTE) {
            if (!esAdmin) {
                throw new AccessDeniedException("Solo los Administradores pueden designar docentes al área.");
            }
        } else if (rolAsignar == Rol.JURADO) {
            if (!esAdmin && !esDocenteAsignado) {
                throw new AccessDeniedException("Solo los Administradores o los Docentes de esta área pueden designar jurados evaluadores.");
            }
        } else {
            throw new IllegalArgumentException("Solo se pueden designar roles DOCENTE o JURADO a través de este módulo.");
        }

        // Buscar usuario a asignar
        User targetUser;
        if (request.getUsuarioId() != null) {
            targetUser = userRepository.findById(request.getUsuarioId())
                    .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + request.getUsuarioId()));
        } else if (request.getEmail() != null && !request.getEmail().isBlank()) {
            targetUser = userRepository.findByEmail(request.getEmail().trim())
                    .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con correo: " + request.getEmail()));
        } else {
            throw new IllegalArgumentException("Debe proporcionar el ID o correo del usuario a designar.");
        }

        Optional<ConvocatoriaParticipante> existente = participanteRepository.findByConvocatoriaIdAndUsuarioId(convocatoriaId, targetUser.getId());
        ConvocatoriaParticipante cp;
        if (existente.isPresent()) {
            cp = existente.get();
            cp.setRol(rolAsignar);
            if (request.getNombreEquipo() != null) {
                cp.setNombreEquipo(request.getNombreEquipo().trim());
            }
            cp.setAsignadoPor(solicitante);
        } else {
            cp = new ConvocatoriaParticipante(
                    conv,
                    targetUser,
                    rolAsignar,
                    request.getNombreEquipo() != null ? request.getNombreEquipo().trim() : null,
                    solicitante
            );
        }

        ConvocatoriaParticipante saved = participanteRepository.save(cp);
        return new ConvocatoriaParticipanteDTO(saved);
    }

    @Transactional
    public ConvocatoriaParticipanteDTO inscribirEstudiante(Long convocatoriaId, InscribirseAreaRequest request, String estudianteEmail) {
        User estudiante = userRepository.findByEmail(estudianteEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + convocatoriaId));

        Optional<ConvocatoriaParticipante> existente = participanteRepository.findByConvocatoriaIdAndUsuarioId(convocatoriaId, estudiante.getId());
        if (existente.isPresent()) {
            ConvocatoriaParticipante cp = existente.get();
            if (request != null && request.getNombreEquipo() != null && !request.getNombreEquipo().isBlank()) {
                cp.setNombreEquipo(request.getNombreEquipo().trim());
                return new ConvocatoriaParticipanteDTO(participanteRepository.save(cp));
            }
            return new ConvocatoriaParticipanteDTO(cp);
        }

        ConvocatoriaParticipante cp = new ConvocatoriaParticipante(
                conv,
                estudiante,
                Rol.ESTUDIANTE,
                (request != null && request.getNombreEquipo() != null) ? request.getNombreEquipo().trim() : null,
                estudiante
        );

        ConvocatoriaParticipante saved = participanteRepository.save(cp);
        return new ConvocatoriaParticipanteDTO(saved);
    }

    @Transactional
    public void removerParticipante(Long convocatoriaId, Long participanteId, String solicitanteEmail) {
        User solicitante = userRepository.findByEmail(solicitanteEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario solicitante no encontrado"));
        ConvocatoriaParticipante cp = participanteRepository.findById(participanteId)
                .orElseThrow(() -> new IllegalArgumentException("Participante no encontrado con ID: " + participanteId));

        if (!cp.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("El participante no pertenece a esta convocatoria.");
        }

        boolean esAdmin = solicitante.getRol() == Rol.ADMIN;
        boolean esDocenteAsignado = participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRol(convocatoriaId, solicitante.getId(), Rol.DOCENTE);

        if (!esAdmin) {
            if (cp.getRol() == Rol.JURADO && esDocenteAsignado) {
                // Docente asignado puede remover a un jurado
            } else if (cp.getUsuario().getId().equals(solicitante.getId())) {
                // El propio usuario puede desinscribirse si es estudiante
            } else {
                throw new AccessDeniedException("No tiene permisos para dar de baja a este participante.");
            }
        }

        participanteRepository.delete(cp);
    }
}
