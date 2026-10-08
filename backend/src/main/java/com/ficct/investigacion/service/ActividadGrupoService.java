package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ActividadGrupoService {

    private final ActividadGrupoRepository actividadGrupoRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final ModuloRepository moduloRepository;
    private final GrupoRepository grupoRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final UserRepository userRepository;
    private final GrupoService grupoService;

    public ActividadGrupoService(ActividadGrupoRepository actividadGrupoRepository,
                                 ConvocatoriaRepository convocatoriaRepository,
                                 ModuloRepository moduloRepository,
                                 GrupoRepository grupoRepository,
                                 ConvocatoriaParticipanteRepository participanteRepository,
                                 UserRepository userRepository,
                                 GrupoService grupoService) {
        this.actividadGrupoRepository = actividadGrupoRepository;
        this.convocatoriaRepository = convocatoriaRepository;
        this.moduloRepository = moduloRepository;
        this.grupoRepository = grupoRepository;
        this.participanteRepository = participanteRepository;
        this.userRepository = userRepository;
        this.grupoService = grupoService;
    }

    private void verificarPermisoGestion(Convocatoria convocatoria, String username) {
        User usuario = userRepository.findByEmail(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (usuario.getRol() == Rol.ADMIN) {
            return;
        }

        if (usuario.getRol() == Rol.DOCENTE) {
            if (convocatoria.getCreador() != null && convocatoria.getCreador().getId().equals(usuario.getId())) {
                return;
            }
            boolean esDocente = participanteRepository
                    .findByConvocatoriaIdAndUsuarioId(convocatoria.getId(), usuario.getId())
                    .map(p -> p.getRol() == Rol.DOCENTE && p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                    .orElse(false);

            if (esDocente) {
                return;
            }
        }

        throw new IllegalArgumentException("No tienes permisos para gestionar actividades en esta área.");
    }

    @Transactional
    public ActividadGrupoDTO crearActividad(Long convocatoriaId, CrearActividadGrupoRequest request, String username) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        verificarPermisoGestion(convocatoria, username);

        User usuario = userRepository.findByEmail(username).orElse(null);

        Modulo modulo = null;
        if (request.getModuloId() != null) {
            modulo = moduloRepository.findById(request.getModuloId()).orElse(null);
        }

        ActividadGrupo actividad = new ActividadGrupo(
                convocatoria,
                modulo,
                request.getTitulo(),
                request.getDescripcion(),
                request.getFechaApertura(),
                request.getFechaCierre(),
                request.getCapacidadPorGrupo(),
                request.getPermitirCambio() != null ? request.getPermitirCambio() : true,
                request.getMostrarMiembros() != null ? request.getMostrarMiembros() : true,
                true,
                usuario
        );

        ActividadGrupo guardada = actividadGrupoRepository.save(actividad);

        // Si se solicitó generar grupos automáticamente
        if (Boolean.TRUE.equals(request.getGenerarGrupos())) {
            int cantidad = (request.getCantidadGrupos() != null && request.getCantidadGrupos() > 0)
                    ? request.getCantidadGrupos()
                    : 10;
            String prefijo = (request.getPrefijoGrupos() != null && !request.getPrefijoGrupos().trim().isEmpty())
                    ? request.getPrefijoGrupos().trim() + " "
                    : "Gr1erPar ";
            Integer capacidad = request.getCapacidadPorGrupo() != null ? request.getCapacidadPorGrupo() : 5;

            List<Grupo> nuevos = new ArrayList<>();
            for (int i = 1; i <= cantidad; i++) {
                Grupo g = new Grupo(convocatoria, guardada, prefijo + i, "Grupo " + i, capacidad, usuario);
                nuevos.add(g);
            }
            grupoRepository.saveAll(nuevos);
        }

        return obtenerDetalle(convocatoriaId, guardada.getId(), username);
    }

    @Transactional
    public ActividadGrupoDTO actualizarActividad(Long convocatoriaId, Long actividadId, CrearActividadGrupoRequest request, String username) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        verificarPermisoGestion(convocatoria, username);

        ActividadGrupo actividad = actividadGrupoRepository.findById(actividadId)
                .orElseThrow(() -> new IllegalArgumentException("Actividad de grupo no encontrada"));

        if (!actividad.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("La actividad no pertenece a esta convocatoria");
        }

        if (request.getTitulo() != null && !request.getTitulo().trim().isEmpty()) {
            actividad.setTitulo(request.getTitulo().trim());
        }
        if (request.getDescripcion() != null) {
            actividad.setDescripcion(request.getDescripcion().trim());
        }
        if (request.getFechaApertura() != null) {
            actividad.setFechaApertura(request.getFechaApertura());
        }
        if (request.getFechaCierre() != null) {
            actividad.setFechaCierre(request.getFechaCierre());
        }
        if (request.getCapacidadPorGrupo() != null && request.getCapacidadPorGrupo() > 0) {
            actividad.setCapacidadPorGrupo(request.getCapacidadPorGrupo());
        }
        if (request.getPermitirCambio() != null) {
            actividad.setPermitirCambio(request.getPermitirCambio());
        }
        if (request.getMostrarMiembros() != null) {
            actividad.setMostrarMiembros(request.getMostrarMiembros());
        }
        if (request.getModuloId() != null) {
            Modulo modulo = moduloRepository.findById(request.getModuloId()).orElse(null);
            actividad.setModulo(modulo);
        }

        ActividadGrupo guardada = actividadGrupoRepository.save(actividad);
        return convertirADTO(guardada, username);
    }

    @Transactional(readOnly = true)
    public List<ActividadGrupoDTO> listarActividades(Long convocatoriaId, String username) {
        List<ActividadGrupo> lista = actividadGrupoRepository.findByConvocatoriaIdOrderByFechaCreacionDesc(convocatoriaId);
        return lista.stream()
                .map(a -> convertirADTO(a, username))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ActividadGrupoDTO obtenerDetalle(Long convocatoriaId, Long actividadId, String username) {
        ActividadGrupo actividad = actividadGrupoRepository.findById(actividadId)
                .orElseThrow(() -> new IllegalArgumentException("Actividad de grupo no encontrada"));

        if (!actividad.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("La actividad no pertenece a la convocatoria indicada.");
        }

        return convertirADTO(actividad, username);
    }

    @Transactional
    public ActividadGrupoDTO elegirGrupo(Long convocatoriaId, Long actividadId, Long grupoId, String username) {
        ActividadGrupo actividad = actividadGrupoRepository.findById(actividadId)
                .orElseThrow(() -> new IllegalArgumentException("Actividad no encontrada"));

        if (!actividad.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("La actividad no pertenece a esta convocatoria.");
        }

        if (actividad.isCerrada()) {
            throw new IllegalArgumentException("Lamentablemente esta actividad cerró y ya no está disponible.");
        }

        User usuario = userRepository.findByEmail(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        ConvocatoriaParticipante participante = participanteRepository
                .findByConvocatoriaIdAndUsuarioId(convocatoriaId, usuario.getId())
                .orElseThrow(() -> new IllegalArgumentException("No estás inscrito en esta convocatoria."));

        if (participante.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) {
            throw new IllegalArgumentException("Tu solicitud de inscripción aún no ha sido admitida por el docente.");
        }

        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo no encontrado"));

        if (!grupo.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("El grupo no pertenece a esta convocatoria.");
        }

        // Buscar si el participante ya tiene un grupo asignado en ESTA actividad específica
        Optional<Grupo> grupoActualEnEstaActividad = participante.getGrupos().stream()
                .filter(g -> (g.getActividadGrupo() != null && g.getActividadGrupo().getId().equals(actividadId))
                        || (actividad.getGrupos() != null && actividad.getGrupos().stream().anyMatch(ag -> ag.getId().equals(g.getId()))))
                .findFirst();

        if (grupoActualEnEstaActividad.isPresent()) {
            Grupo actual = grupoActualEnEstaActividad.get();
            if (actual.getId().equals(grupoId)) {
                // Ya está en ese mismo grupo para esta actividad
                return convertirADTO(actividad, username);
            }
            if (!actividad.isPermitirCambio()) {
                throw new IllegalArgumentException("Esta actividad no permite cambiar de grupo una vez guardada tu elección.");
            }
            // Quitar del grupo anterior de esta actividad
            participante.removerGrupo(actual.getId());
        }

        // Validar cupo del nuevo grupo
        List<ConvocatoriaParticipante> miembrosNuevo = participanteRepository.findMiembrosPorGrupoId(grupo.getId());
        boolean yaEsMiembro = miembrosNuevo.stream().anyMatch(m -> m.getId().equals(participante.getId()));

        if (!yaEsMiembro && grupo.getCapacidadMaxima() != null && grupo.getCapacidadMaxima() > 0) {
            if (miembrosNuevo.size() >= grupo.getCapacidadMaxima()) {
                throw new IllegalArgumentException("El grupo '" + grupo.getNombre() + "' ya está completo (" +
                        grupo.getCapacidadMaxima() + " miembros). Elige otro grupo disponible.");
            }
        }

        // Unir al nuevo grupo de esta actividad y recalcular equipos
        participante.agregarGrupo(grupo);
        participanteRepository.save(participante);

        return convertirADTO(actividad, username);
    }

    @Transactional
    public ActividadGrupoDTO anularEleccion(Long convocatoriaId, Long actividadId, String username) {
        ActividadGrupo actividad = actividadGrupoRepository.findById(actividadId)
                .orElseThrow(() -> new IllegalArgumentException("Actividad no encontrada"));

        if (actividad.isCerrada()) {
            throw new IllegalArgumentException("La actividad ya está cerrada. No se pueden realizar cambios.");
        }

        if (!actividad.isPermitirCambio()) {
            throw new IllegalArgumentException("Esta actividad no permite anular o cambiar la elección.");
        }

        User usuario = userRepository.findByEmail(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        ConvocatoriaParticipante participante = participanteRepository
                .findByConvocatoriaIdAndUsuarioId(convocatoriaId, usuario.getId())
                .orElseThrow(() -> new IllegalArgumentException("No estás inscrito en esta convocatoria."));

        // Buscar el grupo que tiene en esta actividad específica
        Optional<Grupo> grupoEnEstaActividad = participante.getGrupos().stream()
                .filter(g -> (g.getActividadGrupo() != null && g.getActividadGrupo().getId().equals(actividadId))
                        || (actividad.getGrupos() != null && actividad.getGrupos().stream().anyMatch(ag -> ag.getId().equals(g.getId()))))
                .findFirst();

        if (grupoEnEstaActividad.isPresent()) {
            participante.removerGrupo(grupoEnEstaActividad.get().getId());
            participanteRepository.save(participante);
        } else if (participante.getGrupo() != null &&
                   (actividad.getGrupos() == null || actividad.getGrupos().isEmpty() ||
                    actividad.getGrupos().stream().anyMatch(ag -> ag.getId().equals(participante.getGrupo().getId())))) {
            participante.setGrupo(null);
            participanteRepository.save(participante);
        }

        return convertirADTO(actividad, username);
    }

    private ActividadGrupoDTO convertirADTO(ActividadGrupo a, String username) {
        List<Grupo> gruposEntidad = a.getGrupos();
        if (gruposEntidad == null || gruposEntidad.isEmpty()) {
            // Si la actividad no tiene grupos asignados directamente, mostrar los grupos generales del área
            gruposEntidad = grupoRepository.findByConvocatoriaIdOrderByNombreAsc(a.getConvocatoria().getId());
        }

        List<GrupoDTO> gruposDTO = gruposEntidad.stream()
                .map(grupoService::convertirAGrupoDTO)
                .collect(Collectors.toList());

        Long grupoSeleccionadoId = null;
        String grupoSeleccionadoNombre = null;
        boolean esEstudiante = false;
        Long currentUserId = null;

        if (username != null) {
            Optional<User> uOpt = userRepository.findByEmail(username);
            if (uOpt.isPresent()) {
                User u = uOpt.get();
                currentUserId = u.getId();
                if (u.getRol() == Rol.ESTUDIANTE) {
                    esEstudiante = true;
                }

                Optional<ConvocatoriaParticipante> partOpt = participanteRepository
                        .findByConvocatoriaIdAndUsuarioId(a.getConvocatoria().getId(), u.getId());
                if (partOpt.isPresent()) {
                    ConvocatoriaParticipante part = partOpt.get();
                    // Buscar si tiene grupo asociado a esta actividad específica
                    Optional<Grupo> gEnActividad = part.getGrupos().stream()
                            .filter(g -> (g.getActividadGrupo() != null && g.getActividadGrupo().getId().equals(a.getId()))
                                    || (a.getGrupos() != null && a.getGrupos().stream().anyMatch(ag -> ag.getId().equals(g.getId()))))
                            .findFirst();

                    if (gEnActividad.isPresent()) {
                        grupoSeleccionadoId = gEnActividad.get().getId();
                        grupoSeleccionadoNombre = gEnActividad.get().getNombre();
                    } else if (part.getGrupo() != null &&
                               a.getGrupos() != null &&
                               a.getGrupos().stream().anyMatch(ag -> ag.getId().equals(part.getGrupo().getId()))) {
                        grupoSeleccionadoId = part.getGrupo().getId();
                        grupoSeleccionadoNombre = part.getGrupo().getNombre();
                    }
                }
            }
        }

        // Si la actividad tiene mostrarMiembros = false y quien consulta es Estudiante,
        // no exponer los datos de los demás estudiantes en cada grupo
        if (!a.isMostrarMiembros() && esEstudiante) {
            final Long finalCurrentUserId = currentUserId;
            for (GrupoDTO gd : gruposDTO) {
                if (gd.getMiembros() != null) {
                    gd.setMiembros(gd.getMiembros().stream()
                            .filter(m -> finalCurrentUserId != null && finalCurrentUserId.equals(m.getUsuarioId()))
                            .collect(Collectors.toList()));
                }
            }
        }

        return new ActividadGrupoDTO(
                a.getId(),
                a.getConvocatoria().getId(),
                a.getModulo() != null ? a.getModulo().getId() : null,
                a.getTitulo(),
                a.getDescripcion(),
                a.getFechaApertura(),
                a.getFechaCierre(),
                a.getCapacidadPorGrupo(),
                a.isPermitirCambio(),
                a.isMostrarMiembros(),
                a.isHabilitada(),
                a.isAbierta(),
                a.isCerrada(),
                grupoSeleccionadoId,
                grupoSeleccionadoNombre,
                gruposDTO
        );
    }
}
