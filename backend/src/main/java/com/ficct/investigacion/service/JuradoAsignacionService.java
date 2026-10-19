package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import com.ficct.investigacion.util.CorreoPermitido;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class JuradoAsignacionService {
    private final ConvocatoriaRepository convocatorias;
    private final ConvocatoriaParticipanteRepository participantes;
    private final UserRepository usuarios;
    private final FeriaPostulacionRepository postulaciones;
    private final GrupoRepository grupos;
    private final JuradoAsignacionRepository asignaciones;
    private final PasswordEncoder passwordEncoder;

    private boolean esFeriaGrupal(Convocatoria convocatoria) {
        return convocatoria.getTipo() == TipoConvocatoria.FERIA
                && convocatoria.getModalidadInscripcion() == ModalidadInscripcion.GRUPAL;
    }

    public JuradoAsignacionService(ConvocatoriaRepository convocatorias,
                                  ConvocatoriaParticipanteRepository participantes,
                                  UserRepository usuarios, FeriaPostulacionRepository postulaciones,
                                  GrupoRepository grupos, JuradoAsignacionRepository asignaciones,
                                  PasswordEncoder passwordEncoder) {
        this.convocatorias = convocatorias;
        this.participantes = participantes;
        this.usuarios = usuarios;
        this.postulaciones = postulaciones;
        this.grupos = grupos;
        this.asignaciones = asignaciones;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public JuradoAsignacionDTO crearYAnadir(Long convocatoriaId, CrearJuradoRequest request, String correoGestor) {
        Convocatoria convocatoria = verificarGestor(convocatoriaId, correoGestor);
        if (request == null || request.nombre() == null || request.apellido() == null
                || request.correo() == null || request.contrasena() == null) {
            throw new IllegalArgumentException("Nombre, apellido, correo y contraseña son obligatorios.");
        }
        String nombre = request.nombre().trim();
        String apellido = request.apellido().trim();
        String correo = request.correo().trim().toLowerCase(Locale.ROOT);
        if (nombre.length() < 2 || nombre.length() > 100 || apellido.length() < 2 || apellido.length() > 100) {
            throw new IllegalArgumentException("Nombre y apellido deben tener entre 2 y 100 caracteres.");
        }
        if (!CorreoPermitido.esValido(correo)) {
            throw new IllegalArgumentException("Usa un correo @uagrm.edu.bo o @gmail.com.");
        }
        if (request.contrasena().length() < 8) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 8 caracteres.");
        }
        if (usuarios.existsByEmail(correo)) {
            throw new IllegalArgumentException("Ya existe una cuenta con ese correo. Selecciónala de la lista de jurados registrados.");
        }
        User nuevo = usuarios.save(new User(nombre, apellido, correo,
                passwordEncoder.encode(request.contrasena()), Rol.JURADO, EstadoUsuario.ACTIVO));
        User gestor = usuarios.findByEmail(correoGestor).orElseThrow();
        ConvocatoriaParticipante jurado = participantes.save(new ConvocatoriaParticipante(
                convocatoria, nuevo, Rol.JURADO, EstadoInscripcion.ACEPTADO, null, gestor));
        return new JuradoAsignacionDTO(jurado.getId(), nuevo.getId(), nuevo.getNombreCompleto(),
                nuevo.getEmail(), false, List.of());
    }

    @Transactional(readOnly = true)
    public JuradosConvocatoriaDTO listar(Long convocatoriaId, String correo) {
        Convocatoria convocatoria = verificarGestor(convocatoriaId, correo);
        List<JuradoProyectoDTO> proyectos = esFeriaGrupal(convocatoria)
                ? postulaciones.findByConvocatoriaIdOrderByIdAsc(convocatoriaId).stream()
                    .filter(p -> p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                    .map(p -> new JuradoProyectoDTO(p.getId(), p.getCodigoEquipo(), p.getTema())).toList()
                : grupos.findByConvocatoriaIdOrderByNombreAsc(convocatoriaId).stream()
                    .map(g -> new JuradoProyectoDTO(g.getId(), g.getNombre(), g.getDescripcion())).toList();
        Map<Long, List<JuradoAsignacion>> porJurado = new HashMap<>();
        for (JuradoAsignacion asignacion : asignaciones.findByConvocatoriaId(convocatoriaId)) {
            porJurado.computeIfAbsent(asignacion.getJurado().getId(), ignored -> new ArrayList<>()).add(asignacion);
        }
        List<JuradoAsignacionDTO> jurados = participantes.findByConvocatoriaIdAndRolAndEstadoInscripcion(
                convocatoriaId, Rol.JURADO, EstadoInscripcion.ACEPTADO).stream().map(jurado -> {
            List<JuradoAsignacion> filas = porJurado.getOrDefault(jurado.getId(), List.of());
            List<Long> ids = filas.stream().map(a -> esFeriaGrupal(convocatoria)
                    ? a.getFeriaPostulacion() == null ? null : a.getFeriaPostulacion().getId()
                    : a.getGrupo() == null ? null : a.getGrupo().getId()).filter(Objects::nonNull).toList();
            return new JuradoAsignacionDTO(jurado.getId(), jurado.getUsuario().getId(),
                    jurado.getUsuario().getNombreCompleto(), jurado.getUsuario().getEmail(),
                    filas.stream().anyMatch(JuradoAsignacion::isTodos), ids);
        }).toList();
        return new JuradosConvocatoriaDTO(proyectos, jurados);
    }

    @Transactional
    public JuradosConvocatoriaDTO guardar(Long convocatoriaId, Long juradoParticipanteId,
                                          JuradoAsignacionRequest request, String correo) {
        Convocatoria convocatoria = verificarGestor(convocatoriaId, correo);
        ConvocatoriaParticipante jurado = participantes.findById(juradoParticipanteId)
                .orElseThrow(() -> new IllegalArgumentException("Jurado no encontrado."));
        if (!convocatoriaId.equals(jurado.getConvocatoria().getId())
                || jurado.getRol() != Rol.JURADO || jurado.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) {
            throw new IllegalArgumentException("El jurado no está asignado a esta convocatoria.");
        }
        if (request == null) throw new IllegalArgumentException("Debe indicar el alcance del jurado.");
        List<Long> ids = request.proyectoIds() == null ? List.of() : request.proyectoIds();
        if (request.todos() && !ids.isEmpty()) {
            throw new IllegalArgumentException("Seleccione todos los proyectos o proyectos específicos.");
        }
        List<JuradoAsignacion> nuevas = new ArrayList<>();
        if (request.todos()) {
            nuevas.add(new JuradoAsignacion(convocatoria, jurado, true, null, null));
        } else {
            for (Long id : new LinkedHashSet<>(ids)) {
                if (id == null) throw new IllegalArgumentException("Proyecto inválido.");
                if (esFeriaGrupal(convocatoria)) {
                    FeriaPostulacion proyecto = postulaciones.findById(id)
                            .orElseThrow(() -> new IllegalArgumentException("Proyecto no encontrado: " + id));
                    if (!convocatoriaId.equals(proyecto.getConvocatoria().getId())
                            || proyecto.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) {
                        throw new IllegalArgumentException("El proyecto no está aceptado en esta convocatoria.");
                    }
                    nuevas.add(new JuradoAsignacion(convocatoria, jurado, false, proyecto, null));
                } else {
                    Grupo grupo = grupos.findById(id)
                            .orElseThrow(() -> new IllegalArgumentException("Grupo no encontrado: " + id));
                    if (!convocatoriaId.equals(grupo.getConvocatoria().getId())) {
                        throw new IllegalArgumentException("El grupo no pertenece a esta convocatoria.");
                    }
                    nuevas.add(new JuradoAsignacion(convocatoria, jurado, false, null, grupo));
                }
            }
        }
        asignaciones.deleteByJuradoId(juradoParticipanteId);
        asignaciones.flush();
        asignaciones.saveAll(nuevas);
        return listar(convocatoriaId, correo);
    }

    @Transactional(readOnly = true)
    public boolean puedeRevisar(User usuario, EntregaTarea entrega) {
        Tarea tarea = entrega.getTarea();
        if (!tarea.isVisibleJurados()) return false;
        Long convocatoriaId = tarea.getConvocatoria().getId();
        Optional<ConvocatoriaParticipante> jurado = participantes.findByConvocatoriaIdAndUsuarioId(
                convocatoriaId, usuario.getId());
        if (jurado.isEmpty() || jurado.get().getRol() != Rol.JURADO
                || jurado.get().getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) return false;
        List<JuradoAsignacion> filas = asignaciones.findByJuradoId(jurado.get().getId());
        if (esFeriaGrupal(tarea.getConvocatoria())
                && entrega.getFeriaPostulacion() == null) return false;
        if (filas.stream().anyMatch(JuradoAsignacion::isTodos)) return true;
        if (esFeriaGrupal(tarea.getConvocatoria())) {
            Long proyectoId = entrega.getFeriaPostulacion() == null ? null : entrega.getFeriaPostulacion().getId();
            return proyectoId != null && filas.stream().anyMatch(a -> a.getFeriaPostulacion() != null
                    && proyectoId.equals(a.getFeriaPostulacion().getId()));
        }
        Set<Long> gruposEntrega = new HashSet<>();
        if (entrega.getGrupo() != null) gruposEntrega.add(entrega.getGrupo().getId());
        if (gruposEntrega.isEmpty()) {
            participantes.findByConvocatoriaIdAndUsuarioId(convocatoriaId, entrega.getEstudiante().getId())
                    .ifPresent(estudiante -> {
                        if (estudiante.getGrupo() != null) gruposEntrega.add(estudiante.getGrupo().getId());
                        estudiante.getGrupos().forEach(g -> gruposEntrega.add(g.getId()));
                    });
        }
        return filas.stream().anyMatch(a -> a.getGrupo() != null && gruposEntrega.contains(a.getGrupo().getId()));
    }

    private Convocatoria verificarGestor(Long convocatoriaId, String correo) {
        User usuario = usuarios.findByEmail(correo)
                .orElseThrow(() -> new AccessDeniedException("Usuario no encontrado."));
        Convocatoria convocatoria = convocatorias.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada."));
        boolean docenteAsignado = usuario.getRol() == Rol.DOCENTE &&
                participantes.existsByConvocatoriaIdAndUsuarioIdAndRolAndEstadoInscripcion(
                        convocatoriaId, usuario.getId(), Rol.DOCENTE, EstadoInscripcion.ACEPTADO);
        boolean creadorDocente = usuario.getRol() == Rol.DOCENTE && convocatoria.getCreador() != null
                && usuario.getId().equals(convocatoria.getCreador().getId());
        if (usuario.getRol() != Rol.ADMIN && !docenteAsignado && !creadorDocente) {
            throw new AccessDeniedException("Solo administradores y docentes de esta convocatoria pueden gestionar jurados.");
        }
        return convocatoria;
    }
}
