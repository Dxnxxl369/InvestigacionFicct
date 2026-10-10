package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.exception.ConvocatoriaConDatosException;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ConvocatoriaService {

    private final ConvocatoriaRepository convocatoriaRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final UserRepository userRepository;
    private final RequisitoRepository requisitoRepository;
    private final NotificacionService notificacionService;
    private final DocumentoRepository documentoRepository;
    private final TareaRepository tareaRepository;
    private final EntregaTareaRepository entregaRepository;
    private final EntregaPuntajeCriterioRepository puntajeCriterioRepository;
    private final EntregaVersionRepository entregaVersionRepository;
    private final RubricaCriterioRepository rubricaCriterioRepository;
    private final ActividadGrupoRepository actividadGrupoRepository;
    private final GrupoRepository grupoRepository;
    private final ModuloRepository moduloRepository;

    public ConvocatoriaService(ConvocatoriaRepository convocatoriaRepository,
                               ConvocatoriaParticipanteRepository participanteRepository,
                               UserRepository userRepository,
                               RequisitoRepository requisitoRepository,
                               @org.springframework.context.annotation.Lazy NotificacionService notificacionService,
                               DocumentoRepository documentoRepository,
                               TareaRepository tareaRepository,
                               EntregaTareaRepository entregaRepository,
                               EntregaPuntajeCriterioRepository puntajeCriterioRepository,
                               EntregaVersionRepository entregaVersionRepository,
                               RubricaCriterioRepository rubricaCriterioRepository,
                               ActividadGrupoRepository actividadGrupoRepository,
                               GrupoRepository grupoRepository,
                               ModuloRepository moduloRepository) {
        this.convocatoriaRepository = convocatoriaRepository;
        this.participanteRepository = participanteRepository;
        this.userRepository = userRepository;
        this.requisitoRepository = requisitoRepository;
        this.notificacionService = notificacionService;
        this.documentoRepository = documentoRepository;
        this.tareaRepository = tareaRepository;
        this.entregaRepository = entregaRepository;
        this.puntajeCriterioRepository = puntajeCriterioRepository;
        this.entregaVersionRepository = entregaVersionRepository;
        this.rubricaCriterioRepository = rubricaCriterioRepository;
        this.actividadGrupoRepository = actividadGrupoRepository;
        this.grupoRepository = grupoRepository;
        this.moduloRepository = moduloRepository;
    }

    @Transactional
    public ConvocatoriaDTO crearConvocatoria(ConvocatoriaRequest request, String userEmail) {
        User creador = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario creador no encontrado"));

        Convocatoria c = new Convocatoria(
                request.getTitulo(),
                request.getDescripcion(),
                request.getTipo(),
                EstadoConvocatoria.BORRADOR,
                request.getFechaCierre(),
                request.getTamanoEquipo(),
                request.getImagenPortada(),
                creador
        );

        if (request.getRequisitos() != null) {
            for (String reqDesc : request.getRequisitos()) {
                if (reqDesc != null && !reqDesc.trim().isEmpty()) {
                    c.addRequisito(new Requisito(reqDesc.trim(), c));
                }
            }
        }

        Convocatoria saved = convocatoriaRepository.save(c);

        // Si el creador tiene rol DOCENTE, registrarlo como docente a cargo del área
        if (creador.getRol() == Rol.DOCENTE) {
            ConvocatoriaParticipante part = new ConvocatoriaParticipante(
                    saved, creador, Rol.DOCENTE, EstadoInscripcion.ACEPTADO, null, creador
            );
            participanteRepository.save(part);
            saved.addParticipante(part);
        }

        // Asignar docentes encargados iniciales
        if (request.getDocenteIds() != null && !request.getDocenteIds().isEmpty()) {
            for (Long docId : request.getDocenteIds()) {
                if (docId != null && !docId.equals(creador.getId())) {
                    userRepository.findById(docId).ifPresent(docente -> {
                        ConvocatoriaParticipante part = new ConvocatoriaParticipante(
                                saved, docente, Rol.DOCENTE, EstadoInscripcion.ACEPTADO, null, creador
                        );
                        participanteRepository.save(part);
                        saved.addParticipante(part);
                    });
                }
            }
        }

        // Asignar jurados evaluadores iniciales
        if (request.getJuradoIds() != null && !request.getJuradoIds().isEmpty()) {
            for (Long jurId : request.getJuradoIds()) {
                if (jurId != null) {
                    userRepository.findById(jurId).ifPresent(jurado -> {
                        ConvocatoriaParticipante part = new ConvocatoriaParticipante(
                                saved, jurado, Rol.JURADO, EstadoInscripcion.ACEPTADO, null, creador
                        );
                        participanteRepository.save(part);
                        saved.addParticipante(part);
                    });
                }
            }
        }

        return new ConvocatoriaDTO(saved);
    }

    @Transactional
    public ConvocatoriaDTO actualizarConvocatoria(Long id, ConvocatoriaRequest request, String userEmail) {
        Convocatoria c = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada con ID: " + id));

        c.setTitulo(request.getTitulo());
        c.setDescripcion(request.getDescripcion());
        c.setTipo(request.getTipo());
        c.setFechaCierre(request.getFechaCierre());
        c.setTamanoEquipo(request.getTamanoEquipo());
        if (request.getImagenPortada() != null) {
            c.setImagenPortada(request.getImagenPortada());
        }

        if (request.getRequisitos() != null) {
            c.getRequisitos().clear();
            for (String reqDesc : request.getRequisitos()) {
                if (reqDesc != null && !reqDesc.trim().isEmpty()) {
                    c.addRequisito(new Requisito(reqDesc.trim(), c));
                }
            }
        }

        User adminUser = userRepository.findByEmail(userEmail).orElse(null);

        // Sincronizar docentes encargados
        if (request.getDocenteIds() != null) {
            List<ConvocatoriaParticipante> docentesActuales = new ArrayList<>(c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.DOCENTE)
                    .collect(Collectors.toList()));

            for (ConvocatoriaParticipante p : docentesActuales) {
                if (p.getUsuario() != null && !request.getDocenteIds().contains(p.getUsuario().getId())) {
                    c.removeParticipante(p);
                    participanteRepository.delete(p);
                }
            }

            Set<Long> idsExistentes = c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.DOCENTE && p.getUsuario() != null)
                    .map(p -> p.getUsuario().getId())
                    .collect(Collectors.toSet());

            for (Long docId : request.getDocenteIds()) {
                if (docId != null && !idsExistentes.contains(docId)) {
                    userRepository.findById(docId).ifPresent(docente -> {
                        ConvocatoriaParticipante part = new ConvocatoriaParticipante(
                                c, docente, Rol.DOCENTE, EstadoInscripcion.ACEPTADO, null, adminUser
                        );
                        participanteRepository.save(part);
                        c.addParticipante(part);
                    });
                }
            }
        }

        // Sincronizar jurados asignados
        if (request.getJuradoIds() != null) {
            List<ConvocatoriaParticipante> juradosActuales = new ArrayList<>(c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.JURADO)
                    .collect(Collectors.toList()));

            for (ConvocatoriaParticipante p : juradosActuales) {
                if (p.getUsuario() != null && !request.getJuradoIds().contains(p.getUsuario().getId())) {
                    c.removeParticipante(p);
                    participanteRepository.delete(p);
                }
            }

            Set<Long> idsExistentes = c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.JURADO && p.getUsuario() != null)
                    .map(p -> p.getUsuario().getId())
                    .collect(Collectors.toSet());

            for (Long jurId : request.getJuradoIds()) {
                if (jurId != null && !idsExistentes.contains(jurId)) {
                    userRepository.findById(jurId).ifPresent(jurado -> {
                        ConvocatoriaParticipante part = new ConvocatoriaParticipante(
                                c, jurado, Rol.JURADO, EstadoInscripcion.ACEPTADO, null, adminUser
                        );
                        participanteRepository.save(part);
                        c.addParticipante(part);
                    });
                }
            }
        }

        Convocatoria saved = convocatoriaRepository.save(c);
        return new ConvocatoriaDTO(saved);
    }

    @Transactional(readOnly = true)
    public Map<String, List<UserDTO>> listarEncargadosDisponibles() {
        List<UserDTO> docentes = userRepository.findByRol(Rol.DOCENTE).stream()
                .filter(u -> u.getEstado() == EstadoUsuario.ACTIVO)
                .map(UserDTO::new)
                .collect(Collectors.toList());

        List<UserDTO> jurados = userRepository.findByRol(Rol.JURADO).stream()
                .filter(u -> u.getEstado() == EstadoUsuario.ACTIVO)
                .map(UserDTO::new)
                .collect(Collectors.toList());

        Map<String, List<UserDTO>> result = new HashMap<>();
        result.put("docentes", docentes);
        result.put("jurados", jurados);
        return result;
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

    @Transactional
    public ConvocatoriaDTO archivarConvocatoria(Long id, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (user.getRol() != Rol.ADMIN) {
            throw new AccessDeniedException("Solo un Administrador puede archivar un área o convocatoria.");
        }
        Convocatoria c = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + id));

        c.setEstado(EstadoConvocatoria.FINALIZADA);
        Convocatoria updated = convocatoriaRepository.save(c);
        return new ConvocatoriaDTO(updated);
    }

    @Transactional
    public void eliminarConvocatoria(Long id, boolean forzar, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (user.getRol() != Rol.ADMIN) {
            throw new AccessDeniedException("Solo un Administrador puede eliminar definitivamente un área o convocatoria.");
        }
        Convocatoria c = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + id));

        int totalParticipantes = c.getParticipantes() != null ? c.getParticipantes().size() : 0;
        int totalTareas = c.getTareas() != null ? c.getTareas().size() : 0;

        if ((totalParticipantes > 0 || totalTareas > 0) && !forzar) {
            throw new ConvocatoriaConDatosException(
                    "El área contiene " + totalParticipantes + " participante(s) y " + totalTareas + " tarea(s) registrada(s). Requiere confirmación para eliminarla definitivamente.",
                    totalParticipantes,
                    totalTareas
            );
        }

        // 1. Desvincular documentos asociados
        List<Documento> docs = documentoRepository.findByConvocatoriaIdOrderByUpdatedAtDesc(id);
        if (docs != null) {
            for (Documento d : docs) {
                d.setConvocatoria(null);
                documentoRepository.save(d);
            }
        }

        // 2. Tareas y entregas
        if (c.getTareas() != null && !c.getTareas().isEmpty()) {
            for (Tarea t : c.getTareas()) {
                if (t.getEntregas() != null && !t.getEntregas().isEmpty()) {
                    for (EntregaTarea et : t.getEntregas()) {
                        puntajeCriterioRepository.deleteByEntrega(et);
                        entregaVersionRepository.deleteByEntrega(et);
                    }
                    entregaRepository.deleteAll(t.getEntregas());
                    t.getEntregas().clear();
                }
                if (t.getRubrica() != null && !t.getRubrica().isEmpty()) {
                    rubricaCriterioRepository.deleteByTarea(t);
                    t.getRubrica().clear();
                }
            }
            tareaRepository.deleteAll(c.getTareas());
            c.getTareas().clear();
        }

        // 3. Actividades de grupo y grupos
        List<ActividadGrupo> actividades = actividadGrupoRepository.findByConvocatoriaIdOrderByFechaCreacionDesc(id);
        if (actividades != null && !actividades.isEmpty()) {
            for (ActividadGrupo ag : actividades) {
                if (ag.getGrupos() != null && !ag.getGrupos().isEmpty()) {
                    for (Grupo g : ag.getGrupos()) {
                        g.getMiembros().clear();
                    }
                    grupoRepository.deleteAll(ag.getGrupos());
                    ag.getGrupos().clear();
                }
            }
            actividadGrupoRepository.deleteAll(actividades);
        }

        List<Grupo> gruposRestantes = grupoRepository.findByConvocatoriaIdOrderByNombreAsc(id);
        if (gruposRestantes != null && !gruposRestantes.isEmpty()) {
            for (Grupo g : gruposRestantes) {
                g.getMiembros().clear();
            }
            grupoRepository.deleteAll(gruposRestantes);
        }

        // 4. Módulos
        List<Modulo> modulos = moduloRepository.findByConvocatoriaOrderByOrdenAscCreatedAtAsc(c);
        if (modulos != null && !modulos.isEmpty()) {
            moduloRepository.deleteAll(modulos);
        }

        // 5. Eliminar Convocatoria (participantes y requisitos eliminados vía cascade orphanRemoval)
        convocatoriaRepository.delete(c);
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
        return obtenerPorIdConUsuario(id, null);
    }

    @Transactional(readOnly = true)
    public ConvocatoriaDTO getById(Long id) {
        return obtenerPorId(id);
    }

    @Transactional(readOnly = true)
    public ConvocatoriaDTO obtenerPorIdConUsuario(Long id, String userEmail) {
        Convocatoria c = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada con ID: " + id));
        ConvocatoriaDTO dto = new ConvocatoriaDTO(c);
        if (userEmail != null && !userEmail.isBlank()) {
            userRepository.findByEmail(userEmail).ifPresent(user -> {
                participanteRepository.findByConvocatoriaIdAndUsuarioId(id, user.getId())
                        .ifPresent(p -> {
                            dto.setMiEstadoInscripcion(p.getEstadoInscripcion());
                            dto.setMiRol(p.getRol());
                        });
                if (dto.getMiEstadoInscripcion() == null && user.getRol() == Rol.DOCENTE && c.getCreador() != null && c.getCreador().getId().equals(user.getId())) {
                    dto.setMiEstadoInscripcion(EstadoInscripcion.ACEPTADO);
                    dto.setMiRol(Rol.DOCENTE);
                }
            });
        }
        return dto;
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaDTO> listarPublicadas(TipoConvocatoria tipo, String query) {
        return listarPublicadasConUsuario(tipo, query, null);
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaDTO> listarPublicadas() {
        return listarPublicadas(null, null);
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaDTO> listarPublicadasConUsuario(TipoConvocatoria tipo, String query, String userEmail) {
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

        User user = (userEmail != null && !userEmail.isBlank())
                ? userRepository.findByEmail(userEmail).orElse(null)
                : null;

        Map<Long, ConvocatoriaParticipante> misParts = new HashMap<>();
        if (user != null) {
            List<ConvocatoriaParticipante> partList = participanteRepository.findByUsuarioId(user.getId());
            for (ConvocatoriaParticipante cp : partList) {
                if (cp.getConvocatoria() != null) {
                    misParts.put(cp.getConvocatoria().getId(), cp);
                }
            }
        }

        return list.stream().map(c -> {
            ConvocatoriaDTO dto = new ConvocatoriaDTO(c);
            if (user != null) {
                ConvocatoriaParticipante cp = misParts.get(c.getId());
                if (cp != null) {
                    dto.setMiEstadoInscripcion(cp.getEstadoInscripcion());
                    dto.setMiRol(cp.getRol());
                } else if (user.getRol() == Rol.DOCENTE && c.getCreador() != null && c.getCreador().getId().equals(user.getId())) {
                    dto.setMiEstadoInscripcion(EstadoInscripcion.ACEPTADO);
                    dto.setMiRol(Rol.DOCENTE);
                }
            }
            return dto;
        }).collect(Collectors.toList());
    }

    // ==========================================
    // APARTADO: "MIS ÁREAS" (DOCENTE / ESTUDIANTE / JURADO)
    // ==========================================

    @Transactional(readOnly = true)
    public List<ConvocatoriaDTO> listarMisAreas(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (user.getRol() == Rol.ADMIN) {
            return listarTodas();
        }

        List<ConvocatoriaParticipante> misParticipaciones = participanteRepository.findByUsuarioId(user.getId());
        List<ConvocatoriaDTO> result = new ArrayList<>();
        java.util.Set<Long> idsAgregados = new java.util.HashSet<>();

        for (ConvocatoriaParticipante cp : misParticipaciones) {
            if (cp.getConvocatoria() == null) continue;
            Long convId = cp.getConvocatoria().getId();

            // Para docente o jurado: mostrar si está ACEPTADO
            if (user.getRol() == Rol.DOCENTE || user.getRol() == Rol.JURADO) {
                if (cp.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO && !idsAgregados.contains(convId)) {
                    ConvocatoriaDTO dto = new ConvocatoriaDTO(cp.getConvocatoria());
                    dto.setMiEstadoInscripcion(cp.getEstadoInscripcion());
                    dto.setMiRol(cp.getRol());
                    result.add(dto);
                    idsAgregados.add(convId);
                }
            } else {
                // Para estudiante: mostrar si está PENDIENTE o ACEPTADO o RECHAZADO
                if ((cp.getEstadoInscripcion() == EstadoInscripcion.PENDIENTE ||
                     cp.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO ||
                     cp.getEstadoInscripcion() == EstadoInscripcion.RECHAZADO) && !idsAgregados.contains(convId)) {
                    ConvocatoriaDTO dto = new ConvocatoriaDTO(cp.getConvocatoria());
                    dto.setMiEstadoInscripcion(cp.getEstadoInscripcion());
                    dto.setMiRol(cp.getRol());
                    result.add(dto);
                    idsAgregados.add(convId);
                }
            }
        }

        // Si es Docente y es creador de alguna convocatoria, incluirla también
        if (user.getRol() == Rol.DOCENTE) {
            List<Convocatoria> todas = convocatoriaRepository.findAll();
            for (Convocatoria c : todas) {
                if (c.getCreador() != null && c.getCreador().getId().equals(user.getId()) && !idsAgregados.contains(c.getId())) {
                    ConvocatoriaDTO dto = new ConvocatoriaDTO(c);
                    dto.setMiEstadoInscripcion(EstadoInscripcion.ACEPTADO);
                    dto.setMiRol(Rol.DOCENTE);
                    result.add(dto);
                    idsAgregados.add(c.getId());
                }
            }
        }

        return result;
    }

    // ==========================================
    // GESTIÓN DE PARTICIPANTES (DOCENTES, JURADOS, ESTUDIANTES)
    // ==========================================

    public boolean puedeGestionarConvocatoria(Convocatoria conv, User solicitante) {
        if (solicitante == null || conv == null) return false;
        if (solicitante.getRol() == Rol.ADMIN) return true;

        if (solicitante.getRol() == Rol.DOCENTE) {
            // Es el creador de la convocatoria
            if (conv.getCreador() != null && conv.getCreador().getId().equals(solicitante.getId())) {
                return true;
            }
            // Está asignado formalmente como docente en el área
            return participanteRepository.existsByConvocatoriaIdAndUsuarioIdAndRol(
                    conv.getId(), solicitante.getId(), Rol.DOCENTE
            );
        }
        return false;
    }

    public void asegurarDocenteEnParticipantes(Convocatoria conv, User docente) {
        if (conv == null || docente == null || docente.getRol() != Rol.DOCENTE) return;
        boolean exists = participanteRepository.existsByConvocatoriaIdAndUsuarioId(conv.getId(), docente.getId());
        if (!exists) {
            ConvocatoriaParticipante part = new ConvocatoriaParticipante(
                    conv, docente, Rol.DOCENTE, EstadoInscripcion.ACEPTADO, null, docente
            );
            participanteRepository.save(part);
            conv.addParticipante(part);
        }
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaParticipanteDTO> listarParticipantes(Long convocatoriaId, String solicitanteEmail) {
        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área no encontrada con ID: " + convocatoriaId));

        User solicitante = null;
        if (solicitanteEmail != null && !solicitanteEmail.isBlank()) {
            solicitante = userRepository.findByEmail(solicitanteEmail).orElse(null);
        }

        boolean esAdmin = solicitante != null && solicitante.getRol() == Rol.ADMIN;
        boolean puedeGestionar = solicitante != null && puedeGestionarConvocatoria(conv, solicitante);
        boolean esDocenteOJurado = solicitante != null && (solicitante.getRol() == Rol.DOCENTE || solicitante.getRol() == Rol.JURADO);

        Optional<ConvocatoriaParticipante> miPart = solicitante != null
                ? participanteRepository.findByConvocatoriaIdAndUsuarioId(convocatoriaId, solicitante.getId())
                : Optional.empty();

        boolean estaInscritoAceptado = miPart.isPresent() && miPart.get().getEstadoInscripcion() == EstadoInscripcion.ACEPTADO;
        boolean esFinalizada = conv.getEstado() == EstadoConvocatoria.FINALIZADA;

        // Reglas de visibilidad:
        // 1. Admin y Docentes/Jurados encargados ven todo (incluyendo pendientes para poder admitir).
        if (esAdmin || puedeGestionar || esDocenteOJurado) {
            return participanteRepository.findByConvocatoriaIdOrderByFechaAsignacionAsc(convocatoriaId).stream()
                    .map(ConvocatoriaParticipanteDTO::new)
                    .collect(Collectors.toList());
        }

        // 2. Estudiantes inscritos y aceptados ven a todos los aceptados (estudiantes, docentes, jurados)
        if (estaInscritoAceptado) {
            return participanteRepository.findByConvocatoriaIdAndEstadoInscripcionOrderByFechaAsignacionAsc(convocatoriaId, EstadoInscripcion.ACEPTADO)
                    .stream()
                    .map(ConvocatoriaParticipanteDTO::new)
                    .collect(Collectors.toList());
        }

        // 3. Si el estudiante tiene su postulación (ej. PENDIENTE o RECHAZADO), debe poder ver al menos su propio registro
        if (miPart.isPresent()) {
            return Collections.singletonList(new ConvocatoriaParticipanteDTO(miPart.get()));
        }

        // 4. Usuarios no inscritos solo pueden ver si la actividad ya culminó (FINALIZADA)
        if (esFinalizada) {
            return participanteRepository.findByConvocatoriaIdAndEstadoInscripcionOrderByFechaAsignacionAsc(convocatoriaId, EstadoInscripcion.ACEPTADO)
                    .stream()
                    .map(ConvocatoriaParticipanteDTO::new)
                    .collect(Collectors.toList());
        }

        // Si no está inscrito y no culminó, restringir acceso
        return new ArrayList<>();
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaParticipanteDTO> listarParticipantes(Long convocatoriaId) {
        return listarParticipantes(convocatoriaId, null);
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

        boolean esAdmin = solicitante.getRol() == Rol.ADMIN;
        boolean puedeGestionar = puedeGestionarConvocatoria(conv, solicitante);

        if (rolAsignar == Rol.DOCENTE) {
            if (!esAdmin) {
                throw new AccessDeniedException("Solo los Administradores pueden designar docentes al área.");
            }
        } else if (rolAsignar == Rol.JURADO) {
            if (!puedeGestionar) {
                throw new AccessDeniedException("Solo los Administradores o los Docentes de esta área pueden designar jurados evaluadores.");
            }
        } else {
            throw new IllegalArgumentException("Solo se pueden designar roles DOCENTE o JURADO a través de este módulo.");
        }

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
            cp.setEstadoInscripcion(EstadoInscripcion.ACEPTADO);
            cp.setFechaRespuesta(LocalDateTime.now());
            if (request.getNombreEquipo() != null) {
                cp.setNombreEquipo(request.getNombreEquipo().trim());
            }
            cp.setAsignadoPor(solicitante);
        } else {
            cp = new ConvocatoriaParticipante(
                    conv,
                    targetUser,
                    rolAsignar,
                    EstadoInscripcion.ACEPTADO,
                    request.getNombreEquipo() != null ? request.getNombreEquipo().trim() : null,
                    solicitante
            );
        }

        ConvocatoriaParticipante saved = participanteRepository.save(cp);
        return new ConvocatoriaParticipanteDTO(saved);
    }

    // ==========================================
    // SOLICITUD Y ADMISIÓN DE ESTUDIANTES
    // ==========================================

    @Transactional
    public ConvocatoriaParticipanteDTO inscribirEstudiante(Long convocatoriaId, InscribirseAreaRequest request, String estudianteEmail) {
        User estudiante = userRepository.findByEmail(estudianteEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + convocatoriaId));

        if (conv.getEstado() != EstadoConvocatoria.PUBLICADA) {
            throw new IllegalStateException("No se pueden recibir postulaciones: la convocatoria se encuentra en estado " + conv.getEstado() + " y aún no ha sido publicada en el portal.");
        }

        String nombreEquipoFinal = (request != null && request.getNombreEquipo() != null && !request.getNombreEquipo().trim().isEmpty())
                ? request.getNombreEquipo().trim()
                : null;

        Optional<ConvocatoriaParticipante> existente = participanteRepository.findByConvocatoriaIdAndUsuarioId(convocatoriaId, estudiante.getId());
        if (existente.isPresent()) {
            ConvocatoriaParticipante cp = existente.get();
            if (cp.getEstadoInscripcion() == EstadoInscripcion.PENDIENTE) {
                throw new IllegalStateException("Ya cuentas con una solicitud pendiente de admisión en esta convocatoria.");
            }
            if (cp.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO) {
                throw new IllegalStateException("Ya te encuentras formalmente admitido en esta convocatoria.");
            }
            // Si fue rechazada o cancelada, se permite volver a postular
            cp.setEstadoInscripcion(EstadoInscripcion.PENDIENTE);
            cp.setFechaSolicitud(LocalDateTime.now());
            cp.setFechaRespuesta(null);
            cp.setMotivoRechazo(null);
            cp.setNombreEquipo(nombreEquipoFinal);
            return new ConvocatoriaParticipanteDTO(participanteRepository.save(cp));
        }

        ConvocatoriaParticipante cp = new ConvocatoriaParticipante(
                conv,
                estudiante,
                Rol.ESTUDIANTE,
                EstadoInscripcion.PENDIENTE,
                nombreEquipoFinal,
                estudiante
        );

        ConvocatoriaParticipante saved = participanteRepository.save(cp);
        conv.addParticipante(saved);
        return new ConvocatoriaParticipanteDTO(saved);
    }

    @Transactional
    public void declinarSolicitudEstudiante(Long convocatoriaId, String estudianteEmail) {
        User estudiante = userRepository.findByEmail(estudianteEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        ConvocatoriaParticipante cp = participanteRepository.findByConvocatoriaIdAndUsuarioId(convocatoriaId, estudiante.getId())
                .orElseThrow(() -> new IllegalArgumentException("No se encontró ninguna postulación para esta convocatoria."));

        if (cp.getEstadoInscripcion() != EstadoInscripcion.PENDIENTE) {
            throw new IllegalStateException("Solo puedes declinar solicitudes que se encuentren en estado Pendiente.");
        }

        participanteRepository.delete(cp);
    }

    @Transactional
    public ConvocatoriaParticipanteDTO admitirEstudiante(Long convocatoriaId, Long participanteId, String solicitanteEmail) {
        User solicitante = userRepository.findByEmail(solicitanteEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + convocatoriaId));

        if (!puedeGestionarConvocatoria(conv, solicitante)) {
            throw new AccessDeniedException("Solo los Administradores o los Docentes a cargo de esta área pueden admitir postulantes.");
        }
        asegurarDocenteEnParticipantes(conv, solicitante);

        ConvocatoriaParticipante cp = participanteRepository.findById(participanteId)
                .orElseThrow(() -> new IllegalArgumentException("Participante no encontrado con ID: " + participanteId));

        if (!cp.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("El participante no pertenece a esta convocatoria.");
        }

        cp.setEstadoInscripcion(EstadoInscripcion.ACEPTADO);
        cp.setFechaRespuesta(LocalDateTime.now());
        cp.setMotivoRechazo(null);
        cp.setAsignadoPor(solicitante);

        ConvocatoriaParticipante saved = participanteRepository.save(cp);
        try {
            notificacionService.crearNotificacion(
                    saved.getUsuario().getId(),
                    Notificacion.INSCRIPCION_ADMITIDA,
                    "¡Solicitud admitida!",
                    "Tu solicitud para '" + conv.getTitulo() + "' fue admitida.",
                    conv.getId(),
                    null,
                    null
            );
        } catch (Exception e) {
            // Silencioso
        }
        return new ConvocatoriaParticipanteDTO(saved);
    }

    @Transactional
    public ConvocatoriaParticipanteDTO rechazarEstudiante(Long convocatoriaId, Long participanteId, String motivo, String solicitanteEmail) {
        User solicitante = userRepository.findByEmail(solicitanteEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + convocatoriaId));

        if (!puedeGestionarConvocatoria(conv, solicitante)) {
            throw new AccessDeniedException("Solo los Administradores o los Docentes a cargo de esta área pueden rechazar postulantes.");
        }
        asegurarDocenteEnParticipantes(conv, solicitante);

        ConvocatoriaParticipante cp = participanteRepository.findById(participanteId)
                .orElseThrow(() -> new IllegalArgumentException("Participante no encontrado con ID: " + participanteId));

        if (!cp.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("El participante no pertenece a esta convocatoria.");
        }

        cp.setEstadoInscripcion(EstadoInscripcion.RECHAZADO);
        cp.setFechaRespuesta(LocalDateTime.now());
        cp.setMotivoRechazo(motivo != null && !motivo.isBlank() ? motivo.trim() : "No cumple con los requisitos del área.");
        cp.setAsignadoPor(solicitante);

        ConvocatoriaParticipante saved = participanteRepository.save(cp);
        try {
            String msg = saved.getMotivoRechazo() != null ? " Motivo: " + saved.getMotivoRechazo() : "";
            notificacionService.crearNotificacion(
                    saved.getUsuario().getId(),
                    Notificacion.INSCRIPCION_RECHAZADA,
                    "Solicitud rechazada",
                    "Tu solicitud para '" + conv.getTitulo() + "' fue rechazada." + msg,
                    conv.getId(),
                    null,
                    null
            );
        } catch (Exception e) {
            // Silencioso
        }
        return new ConvocatoriaParticipanteDTO(saved);
    }

    @Transactional
    public void removerParticipante(Long convocatoriaId, Long participanteId, String solicitanteEmail) {
        User solicitante = userRepository.findByEmail(solicitanteEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario solicitante no encontrado"));
        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new IllegalArgumentException("Área o Convocatoria no encontrada con ID: " + convocatoriaId));
        ConvocatoriaParticipante cp = participanteRepository.findById(participanteId)
                .orElseThrow(() -> new IllegalArgumentException("Participante no encontrado con ID: " + participanteId));

        if (!cp.getConvocatoria().getId().equals(convocatoriaId)) {
            throw new IllegalArgumentException("El participante no pertenece a esta convocatoria.");
        }

        boolean esAdmin = solicitante.getRol() == Rol.ADMIN;
        boolean puedeGestionar = puedeGestionarConvocatoria(conv, solicitante);

        if (!esAdmin) {
            if (cp.getRol() == Rol.JURADO && puedeGestionar) {
                // Docente a cargo puede remover a un jurado
            } else if (cp.getRol() == Rol.ESTUDIANTE && puedeGestionar) {
                // Docente a cargo puede remover a un estudiante
            } else if (cp.getUsuario().getId().equals(solicitante.getId())) {
                // El propio usuario puede desinscribirse si es estudiante
            } else {
                throw new AccessDeniedException("No tiene permisos para dar de baja a este participante.");
            }
        }

        participanteRepository.delete(cp);
    }
}
