package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GrupoService {

    private final GrupoRepository grupoRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final UserRepository userRepository;
    private final ActividadGrupoRepository actividadGrupoRepository;

    public GrupoService(GrupoRepository grupoRepository,
                        ConvocatoriaRepository convocatoriaRepository,
                        ConvocatoriaParticipanteRepository participanteRepository,
                        UserRepository userRepository,
                        ActividadGrupoRepository actividadGrupoRepository) {
        this.grupoRepository = grupoRepository;
        this.convocatoriaRepository = convocatoriaRepository;
        this.participanteRepository = participanteRepository;
        this.userRepository = userRepository;
        this.actividadGrupoRepository = actividadGrupoRepository;
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
            boolean esDocenteEncargado = participanteRepository
                    .findByConvocatoriaIdAndUsuarioId(convocatoria.getId(), usuario.getId())
                    .map(p -> p.getRol() == Rol.DOCENTE && p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                    .orElse(false);

            if (esDocenteEncargado) {
                return;
            }
        }

        throw new IllegalArgumentException("No tienes permisos de docente o administrador para gestionar grupos en esta área.");
    }

    @Transactional(readOnly = true)
    public GruposAreaResponse obtenerGruposArea(Long convocatoriaId) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));

        List<Grupo> grupos = grupoRepository.findByConvocatoriaIdOrderByNombreAsc(convocatoriaId);
        List<GrupoDTO> grupoDTOs = grupos.stream().map(this::convertirAGrupoDTO).collect(Collectors.toList());

        List<ConvocatoriaParticipante> todosParticipantes = participanteRepository.findByConvocatoriaId(convocatoriaId);

        List<ConvocatoriaParticipanteDTO> sinEquipoDTOs = todosParticipantes.stream()
                .filter(p -> p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO &&
                             p.getRol() == Rol.ESTUDIANTE &&
                             p.getGrupo() == null)
                .map(this::convertirAParticipanteDTO)
                .collect(Collectors.toList());

        long totalEstudiantes = todosParticipantes.stream()
                .filter(p -> p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO && p.getRol() == Rol.ESTUDIANTE)
                .count();

        int conEquipo = (int) (totalEstudiantes - sinEquipoDTOs.size());

        return new GruposAreaResponse(grupoDTOs, sinEquipoDTOs, (int) totalEstudiantes, conEquipo, sinEquipoDTOs.size());
    }

    @Transactional
    public GrupoDTO crearGrupo(Long convocatoriaId, CrearGrupoRequest request, String username) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        verificarPermisoGestion(convocatoria, username);

        User usuario = userRepository.findByEmail(username).orElse(null);

        ActividadGrupo actividad = null;
        if (request.getActividadGrupoId() != null) {
            actividad = actividadGrupoRepository.findById(request.getActividadGrupoId()).orElse(null);
        }

        Grupo grupo = new Grupo(convocatoria, actividad, request.getNombre(), request.getDescripcion(),
                request.getCapacidadMaxima(), usuario);
        Grupo guardado = grupoRepository.save(grupo);
        return convertirAGrupoDTO(guardado);
    }

    @Transactional
    public List<GrupoDTO> generarLoteGrupos(Long convocatoriaId, GenerarLoteGruposRequest request, String username) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        verificarPermisoGestion(convocatoria, username);

        User usuario = userRepository.findByEmail(username).orElse(null);

        ActividadGrupo actividad = null;
        if (request.getActividadGrupoId() != null) {
            actividad = actividadGrupoRepository.findById(request.getActividadGrupoId()).orElse(null);
        }

        String prefijo = (request.getPrefijo() != null && !request.getPrefijo().trim().isEmpty())
                ? request.getPrefijo().trim() + " "
                : "Grupo ";
        int cantidad = request.getCantidad() > 0 ? request.getCantidad() : 5;
        Integer capacidad = request.getCapacidadMaxima() != null && request.getCapacidadMaxima() > 0
                ? request.getCapacidadMaxima()
                : 5;

        List<Grupo> nuevosGrupos = new ArrayList<>();
        for (int i = 1; i <= cantidad; i++) {
            String nombre = prefijo + i;
            Grupo g = new Grupo(convocatoria, actividad, nombre, "Grupo " + i + " de la actividad académica", capacidad, usuario);
            nuevosGrupos.add(g);
        }

        List<Grupo> guardados = grupoRepository.saveAll(nuevosGrupos);
        return guardados.stream().map(this::convertirAGrupoDTO).collect(Collectors.toList());
    }

    @Transactional
    public GrupoDTO actualizarGrupo(Long convocatoriaId, Long grupoId, CrearGrupoRequest request, String username) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        verificarPermisoGestion(convocatoria, username);

        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo no encontrado"));

        if (!grupo.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("El grupo no pertenece a la convocatoria indicada.");
        }

        if (request.getNombre() != null && !request.getNombre().trim().isEmpty()) {
            grupo.setNombre(request.getNombre().trim());
        }
        grupo.setDescripcion(request.getDescripcion());
        if (request.getCapacidadMaxima() != null && request.getCapacidadMaxima() > 0) {
            grupo.setCapacidadMaxima(request.getCapacidadMaxima());
        }

        Grupo guardado = grupoRepository.save(grupo);
        return convertirAGrupoDTO(guardado);
    }

    @Transactional
    public void eliminarGrupo(Long convocatoriaId, Long grupoId, String username) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        verificarPermisoGestion(convocatoria, username);

        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo no encontrado"));

        if (!grupo.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("El grupo no pertenece a la convocatoria indicada.");
        }

        // Desvincular miembros
        List<ConvocatoriaParticipante> miembros = participanteRepository.findByConvocatoriaId(convocatoriaId).stream()
                .filter(p -> p.getGrupo() != null && p.getGrupo().getId().equals(grupoId))
                .collect(Collectors.toList());

        for (ConvocatoriaParticipante m : miembros) {
            m.setGrupo(null);
            m.setNombreEquipo(null);
            participanteRepository.save(m);
        }

        grupoRepository.delete(grupo);
    }

    @Transactional
    public GrupoDTO asignarMiembro(Long convocatoriaId, Long grupoId, Long participanteId, String username) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        verificarPermisoGestion(convocatoria, username);

        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo no encontrado"));

        if (!grupo.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("El grupo no pertenece a la convocatoria indicada.");
        }

        ConvocatoriaParticipante participante = participanteRepository.findById(participanteId)
                .orElseThrow(() -> new IllegalArgumentException("Participante no encontrado"));

        if (!participante.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("El participante no pertenece a esta convocatoria.");
        }

        if (participante.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) {
            throw new IllegalArgumentException("Solo estudiantes formalmente admitidos pueden unirse a grupos.");
        }

        if (grupo.isCompleto() && (participante.getGrupo() == null || !participante.getGrupo().getId().equals(grupoId))) {
            throw new IllegalArgumentException("El grupo '" + grupo.getNombre() + "' ya alcanzó su capacidad máxima de " +
                    grupo.getCapacidadMaxima() + " integrantes.");
        }

        participante.setGrupo(grupo);
        participanteRepository.save(participante);

        return convertirAGrupoDTO(grupoRepository.findById(grupoId).orElse(grupo));
    }

    @Transactional
    public GrupoDTO removerMiembro(Long convocatoriaId, Long grupoId, Long participanteId, String username) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        verificarPermisoGestion(convocatoria, username);

        Grupo grupo = grupoRepository.findById(grupoId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo no encontrado"));

        ConvocatoriaParticipante participante = participanteRepository.findById(participanteId)
                .orElseThrow(() -> new IllegalArgumentException("Participante no encontrado"));

        if (participante.getGrupo() != null && participante.getGrupo().getId().equals(grupoId)) {
            participante.setGrupo(null);
            participante.setNombreEquipo(null);
            participanteRepository.save(participante);
        }

        return convertirAGrupoDTO(grupoRepository.findById(grupoId).orElse(grupo));
    }

    public GrupoDTO convertirAGrupoDTO(Grupo g) {
        List<ConvocatoriaParticipante> miembrosEntidad = participanteRepository.findByConvocatoriaId(g.getConvocatoria().getId()).stream()
                .filter(p -> p.getGrupo() != null && p.getGrupo().getId().equals(g.getId()))
                .collect(Collectors.toList());

        List<MiembroGrupoDTO> miembrosDTO = miembrosEntidad.stream().map(p -> new MiembroGrupoDTO(
                p.getId(),
                p.getUsuario().getId(),
                p.getUsuario().getNombreCompleto(),
                p.getUsuario().getEmail(),
                p.getUsuario().getFotoPerfil(),
                p.getFechaAsignacion()
        )).collect(Collectors.toList());

        boolean completo = g.getCapacidadMaxima() != null && g.getCapacidadMaxima() > 0 && miembrosDTO.size() >= g.getCapacidadMaxima();

        return new GrupoDTO(
                g.getId(),
                g.getConvocatoria().getId(),
                g.getActividadGrupo() != null ? g.getActividadGrupo().getId() : null,
                g.getNombre(),
                g.getDescripcion(),
                g.getCapacidadMaxima(),
                miembrosDTO.size(),
                completo,
                miembrosDTO
        );
    }

    private ConvocatoriaParticipanteDTO convertirAParticipanteDTO(ConvocatoriaParticipante p) {
        return new ConvocatoriaParticipanteDTO(p);
    }
}
