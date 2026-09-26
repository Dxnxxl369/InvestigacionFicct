package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.ModuloDTO;
import com.ficct.investigacion.dto.ModuloRequest;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ModuloService {

    private final ModuloRepository moduloRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final TareaRepository tareaRepository;
    private final UserRepository userRepository;

    public ModuloService(ModuloRepository moduloRepository,
                         ConvocatoriaRepository convocatoriaRepository,
                         ConvocatoriaParticipanteRepository participanteRepository,
                         TareaRepository tareaRepository,
                         UserRepository userRepository) {
        this.moduloRepository = moduloRepository;
        this.convocatoriaRepository = convocatoriaRepository;
        this.participanteRepository = participanteRepository;
        this.tareaRepository = tareaRepository;
        this.userRepository = userRepository;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con email: " + email));
    }

    private boolean puedeGestionarModulo(Convocatoria convocatoria, User user) {
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

    @Transactional(readOnly = true)
    public List<ModuloDTO> listarPorConvocatoria(Long convocatoriaId) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + convocatoriaId));

        return moduloRepository.findByConvocatoriaOrderByOrdenAscCreatedAtAsc(convocatoria).stream()
                .map(ModuloDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ModuloDTO obtenerPorId(Long moduloId) {
        Modulo modulo = moduloRepository.findById(moduloId)
                .orElseThrow(() -> new IllegalArgumentException("Módulo no encontrado con ID: " + moduloId));
        return new ModuloDTO(modulo);
    }

    @Transactional
    public ModuloDTO crearModulo(Long convocatoriaId, ModuloRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + convocatoriaId));

        if (!puedeGestionarModulo(convocatoria, user)) {
            throw new AccessDeniedException("Solo un docente a cargo del área o un Administrador puede crear módulos.");
        }

        Modulo modulo = new Modulo(
                convocatoria,
                request.getTitulo().trim(),
                request.getDescripcion() != null ? request.getDescripcion().trim() : null,
                request.getImagenUrl() != null && !request.getImagenUrl().isBlank() ? request.getImagenUrl().trim() : null,
                request.getOrden() != null ? request.getOrden() : 1,
                request.getActivo() != null ? request.getActivo() : true
        );

        Modulo saved = moduloRepository.save(modulo);
        return new ModuloDTO(saved);
    }

    @Transactional
    public ModuloDTO actualizarModulo(Long moduloId, ModuloRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        Modulo modulo = moduloRepository.findById(moduloId)
                .orElseThrow(() -> new IllegalArgumentException("Módulo no encontrado con ID: " + moduloId));

        if (!puedeGestionarModulo(modulo.getConvocatoria(), user)) {
            throw new AccessDeniedException("Solo un docente a cargo del área o un Administrador puede modificar módulos.");
        }

        if (request.getTitulo() != null && !request.getTitulo().isBlank()) {
            modulo.setTitulo(request.getTitulo().trim());
        }
        if (request.getDescripcion() != null) {
            modulo.setDescripcion(request.getDescripcion().trim());
        }
        if (request.getImagenUrl() != null) {
            modulo.setImagenUrl(request.getImagenUrl().trim());
        }
        if (request.getOrden() != null) {
            modulo.setOrden(request.getOrden());
        }
        if (request.getActivo() != null) {
            modulo.setActivo(request.getActivo());
        }

        Modulo saved = moduloRepository.save(modulo);
        return new ModuloDTO(saved);
    }

    @Transactional
    public void eliminarModulo(Long moduloId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Modulo modulo = moduloRepository.findById(moduloId)
                .orElseThrow(() -> new IllegalArgumentException("Módulo no encontrado con ID: " + moduloId));

        if (!puedeGestionarModulo(modulo.getConvocatoria(), user)) {
            throw new AccessDeniedException("Solo un docente a cargo del área o un Administrador puede eliminar módulos.");
        }

        // Desvincular tareas para que no se pierdan, queden como tareas generales sin módulo
        if (modulo.getTareas() != null && !modulo.getTareas().isEmpty()) {
            for (Tarea t : modulo.getTareas()) {
                t.setModulo(null);
                tareaRepository.save(t);
            }
            modulo.getTareas().clear();
        }

        moduloRepository.delete(modulo);
    }
}
