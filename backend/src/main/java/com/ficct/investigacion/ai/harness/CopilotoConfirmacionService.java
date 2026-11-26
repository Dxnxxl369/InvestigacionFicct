package com.ficct.investigacion.ai.harness;

import com.ficct.investigacion.dto.CopilotoDTO.ConfirmarAccionRequest;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.GenerarLoteGruposRequest;
import com.ficct.investigacion.dto.TareaRequest;
import com.ficct.investigacion.model.Convocatoria;
import com.ficct.investigacion.model.EstadoConvocatoria;
import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Modulo;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.Tarea;
import com.ficct.investigacion.model.TipoConvocatoria;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.ConvocatoriaRepository;
import com.ficct.investigacion.repository.ModuloRepository;
import com.ficct.investigacion.repository.TareaRepository;
import com.ficct.investigacion.repository.UserRepository;
import com.ficct.investigacion.service.ConvocatoriaService;
import com.ficct.investigacion.service.GrupoService;
import com.ficct.investigacion.service.PlantillaService;
import com.ficct.investigacion.service.PlantillaService.ActividadDatos;
import com.ficct.investigacion.service.PlantillaService.AsignacionDatos;
import com.ficct.investigacion.service.PlantillaService.PlantillaDatos;
import com.ficct.investigacion.service.PlantillaService.TipoDatos;
import com.ficct.investigacion.service.TareaService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class CopilotoConfirmacionService {

    private final UserRepository userRepository;
    private final TareaRepository tareaRepository;
    private final TareaService tareaService;
    private final ConvocatoriaService convocatoriaService;
    private final PlantillaService plantillaService;
    private final GrupoService grupoService;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final ModuloRepository moduloRepository;

    public CopilotoConfirmacionService(UserRepository userRepository,
                                       TareaRepository tareaRepository,
                                       TareaService tareaService,
                                       ConvocatoriaService convocatoriaService,
                                       PlantillaService plantillaService,
                                       GrupoService grupoService,
                                       ConvocatoriaRepository convocatoriaRepository,
                                       ModuloRepository moduloRepository) {
        this.userRepository = userRepository;
        this.tareaRepository = tareaRepository;
        this.tareaService = tareaService;
        this.convocatoriaService = convocatoriaService;
        this.plantillaService = plantillaService;
        this.grupoService = grupoService;
        this.convocatoriaRepository = convocatoriaRepository;
        this.moduloRepository = moduloRepository;
    }

    @Transactional
    public CopilotoResponse ejecutarConfirmacion(ConfirmarAccionRequest req, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (user.getRol() != Rol.ADMIN && user.getRol() != Rol.DOCENTE) {
            throw new AccessDeniedException("Solo Docentes o Administradores pueden confirmar cambios.");
        }
        if (req.getTipoAccion() == null || req.getTargetId() == null) {
            throw new IllegalArgumentException("Datos de confirmación incompletos.");
        }

        CopilotoResponse resp = new CopilotoResponse();

        switch (req.getTipoAccion()) {
            case "GESTIONAR_TAREAS_LOTE" -> {
                List<Long> ids = (req.getTargetIds() != null && !req.getTargetIds().isEmpty())
                        ? req.getTargetIds()
                        : List.of(req.getTargetId());
                int actualizadas = 0;
                for (Long id : ids) {
                    Tarea tarea = tareaRepository.findById(id).orElse(null);
                    if (tarea == null) continue;
                    boolean habFinal = req.getHabilitada() != null ? req.getHabilitada() : tarea.isHabilitada();
                    LocalDateTime fHab = req.getFechaHabilitacion() != null && !req.getFechaHabilitacion().isBlank()
                            ? parsearFecha(req.getFechaHabilitacion(), LocalTime.of(0, 0)) : tarea.getFechaHabilitacion();
                    LocalDateTime fEnt = req.getFechaEntrega() != null && !req.getFechaEntrega().isBlank()
                            ? parsearFecha(req.getFechaEntrega(), LocalTime.of(23, 59)) : tarea.getFechaEntrega();
                    LocalDateTime fCor = req.getFechaCorte() != null && !req.getFechaCorte().isBlank()
                            ? parsearFecha(req.getFechaCorte(), LocalTime.of(23, 59)) : tarea.getFechaCorte();

                    TareaRequest tr = new TareaRequest();
                    tr.setConvocatoriaId(tarea.getConvocatoria().getId());
                    tr.setTitulo(tarea.getTitulo());
                    tr.setDescripcion(tarea.getDescripcion());
                    tr.setHabilitada(habFinal);
                    tr.setVisibleJurados(tarea.isVisibleJurados());
                    tr.setTiposArchivosPermitidos(tarea.getTiposArchivosPermitidos());
                    tr.setTamanoMaximoMb(tarea.getTamanoMaximoMb());
                    tr.setPuntajeMaximo(tarea.getPuntajeMaximo());
                    tr.setEsGrupal(tarea.isEsGrupal());
                    tr.setFechaHabilitacion(fHab);
                    tr.setFechaEntrega(fEnt);
                    tr.setFechaCorte(fCor);
                    tr.setFechaLimite(fEnt != null ? fEnt : tarea.getFechaLimite());
                    if (tarea.getModulo() != null) {
                        tr.setModuloId(tarea.getModulo().getId());
                    }
                    tareaService.actualizarTarea(tarea.getId(), tr, userEmail);
                    actualizadas++;
                }
                resp.setMensaje("Listo, se actualizaron " + actualizadas + " tarea(s) correctamente.");
            }
            case "GESTIONAR_TAREA", "HABILITAR_TAREA", "DESHABILITAR_TAREA", "EDITAR_FECHA_TAREA" -> {
                Tarea tarea = tareaRepository.findById(req.getTargetId())
                        .orElseThrow(() -> new IllegalArgumentException("La tarea ya no existe."));

                boolean habilitadaFinal = req.getHabilitada() != null
                        ? req.getHabilitada()
                        : ("HABILITAR_TAREA".equals(req.getTipoAccion()) || (!"DESHABILITAR_TAREA".equals(req.getTipoAccion()) && tarea.isHabilitada()));

                LocalDateTime fechaHab = req.getFechaHabilitacion() != null && !req.getFechaHabilitacion().isBlank()
                        ? parsearFecha(req.getFechaHabilitacion(), LocalTime.of(0, 0))
                        : tarea.getFechaHabilitacion();

                LocalDateTime fechaEnt = req.getFechaEntrega() != null && !req.getFechaEntrega().isBlank()
                        ? parsearFecha(req.getFechaEntrega(), LocalTime.of(23, 59))
                        : (req.getValorTexto() != null && !req.getValorTexto().isBlank()
                            ? parsearFecha(req.getValorTexto(), LocalTime.of(23, 59))
                            : tarea.getFechaEntrega());

                LocalDateTime fechaCor = req.getFechaCorte() != null && !req.getFechaCorte().isBlank()
                        ? parsearFecha(req.getFechaCorte(), LocalTime.of(23, 59))
                        : tarea.getFechaCorte();

                TareaRequest tr = new TareaRequest();
                tr.setConvocatoriaId(tarea.getConvocatoria().getId());
                tr.setTitulo(tarea.getTitulo());
                tr.setDescripcion(tarea.getDescripcion());
                tr.setHabilitada(habilitadaFinal);
                tr.setVisibleJurados(tarea.isVisibleJurados());
                tr.setTiposArchivosPermitidos(tarea.getTiposArchivosPermitidos());
                tr.setTamanoMaximoMb(tarea.getTamanoMaximoMb());
                tr.setPuntajeMaximo(tarea.getPuntajeMaximo());
                tr.setEsGrupal(tarea.isEsGrupal());
                tr.setFechaHabilitacion(fechaHab);
                tr.setFechaEntrega(fechaEnt);
                tr.setFechaCorte(fechaCor);
                tr.setFechaLimite(fechaEnt != null ? fechaEnt : tarea.getFechaLimite());
                if (tarea.getModulo() != null) {
                    tr.setModuloId(tarea.getModulo().getId());
                }
                tareaService.actualizarTarea(tarea.getId(), tr, userEmail);

                resp.setMensaje("Listo, la tarea \"" + tarea.getTitulo() + "\" quedó "
                        + (habilitadaFinal ? "habilitada" : "deshabilitada") + " con sus fechas actualizadas.");
            }
            case "CAMBIAR_ESTADO_LOTE", "CAMBIAR_ESTADO_CONVOCATORIA" -> {
                String val = req.getValorTexto() != null ? req.getValorTexto().trim().toUpperCase() : "";
                List<Long> ids = (req.getTargetIds() != null && !req.getTargetIds().isEmpty())
                        ? req.getTargetIds()
                        : List.of(req.getTargetId());

                int procesadas = 0;
                for (Long id : ids) {
                    if ("ARCHIVADA".equals(val)) {
                        convocatoriaService.archivarConvocatoria(id, userEmail);
                    } else {
                        EstadoConvocatoria estado = EstadoConvocatoria.valueOf(val);
                        if (estado == EstadoConvocatoria.PUBLICADA) {
                            convocatoriaService.publicarConvocatoria(id, userEmail);
                        } else {
                            convocatoriaService.cambiarEstado(id, estado);
                        }
                    }
                    procesadas++;
                }
                resp.setMensaje("Listo, se actualizaron " + procesadas + " convocatoria(s) a estado " + val + ".");
            }
            case "GESTIONAR_PLANTILLA_TAREA" -> {
                if (user.getRol() != Rol.ADMIN) {
                    throw new AccessDeniedException("Solo Administradores pueden modificar plantillas.");
                }
                Long plantillaId = req.getTargetId();
                Long actividadId = Long.parseLong(req.getValorTexto());
                PlantillaDatos plantilla = plantillaService.listar().stream()
                        .filter(p -> plantillaId.equals(p.id()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Plantilla no encontrada."));

                List<ActividadDatos> nuevas = new ArrayList<>();
                String tituloAct = "";
                for (ActividadDatos a : plantilla.actividades()) {
                    if (actividadId.equals(a.id())) {
                        tituloAct = a.titulo();
                        LocalDateTime fHab = req.getFechaHabilitacion() != null && !req.getFechaHabilitacion().isBlank()
                                ? parsearFecha(req.getFechaHabilitacion(), LocalTime.of(0, 0)) : a.fechaHabilitacion();
                        LocalDateTime fEnt = req.getFechaEntrega() != null && !req.getFechaEntrega().isBlank()
                                ? parsearFecha(req.getFechaEntrega(), LocalTime.of(23, 59)) : a.fechaEntrega();
                        LocalDateTime fCor = req.getFechaCorte() != null && !req.getFechaCorte().isBlank()
                                ? parsearFecha(req.getFechaCorte(), LocalTime.of(23, 59)) : a.fechaLimite();
                        boolean hab = req.getHabilitada() != null ? req.getHabilitada() : Boolean.TRUE.equals(a.habilitada());
                        nuevas.add(new ActividadDatos(
                                a.id(), a.titulo(), a.descripcion(), a.tiposArchivosPermitidos(),
                                a.tamanoMaximoMb(), a.puntajeMaximo(), a.visibleJurados(), a.entregaGrupal(),
                                fHab, fEnt, fCor, hab, a.adjuntos(), a.rubrica()
                        ));
                    } else {
                        nuevas.add(a);
                    }
                }
                plantillaService.actualizar(plantilla.id(), new PlantillaDatos(plantilla.id(), plantilla.titulo(), plantilla.descripcion(), nuevas));
                resp.setMensaje("Plantilla \"" + plantilla.titulo() + "\" actualizada para \"" + tituloAct + "\" y sincronizada con sus aulas.");
            }
            case "ASIGNAR_PLANTILLA_TIPOS" -> {
                if (user.getRol() != Rol.ADMIN) {
                    throw new AccessDeniedException("Solo Administradores pueden configurar tipos de plantillas.");
                }
                Long plantillaId = req.getTargetId();
                boolean habilitar = !Boolean.FALSE.equals(req.getHabilitada());
                String[] tiposArr = (req.getValorTexto() != null ? req.getValorTexto() : "").split(",");
                List<TipoDatos> actuales = plantillaService.configuracionTipos();
                int actualizados = 0;
                for (String tRaw : tiposArr) {
                    if (tRaw.isBlank()) continue;
                    TipoConvocatoria tipo = TipoConvocatoria.valueOf(tRaw.trim());
                    List<Long> ids = new ArrayList<>();
                    actuales.stream()
                            .filter(td -> td.tipo() == tipo)
                            .findFirst()
                            .ifPresent(td -> {
                                if (td.plantillaIds() != null) ids.addAll(td.plantillaIds());
                            });
                    if (habilitar && !ids.contains(plantillaId)) {
                        ids.add(plantillaId);
                    } else if (!habilitar) {
                        ids.remove(plantillaId);
                    }
                    plantillaService.configurarTipo(tipo, new AsignacionDatos(ids));
                    actualizados++;
                }
                resp.setMensaje("Listo, la plantilla fue " + (habilitar ? "habilitada" : "deshabilitada") + " en " + actualizados + " tipo(s) y sincronizada con las aulas activas.");
            }
            case "ASIGNAR_PLANTILLA_EVENTOS" -> {
                if (user.getRol() != Rol.ADMIN) {
                    throw new AccessDeniedException("Solo Administradores pueden asignar plantillas a eventos.");
                }
                Long plantillaId = req.getTargetId();
                PlantillaDatos plantilla = plantillaService.listar().stream()
                        .filter(p -> plantillaId.equals(p.id()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Plantilla no encontrada."));
                List<Long> convIds = req.getTargetIds() != null ? req.getTargetIds() : List.of();
                int aplicadas = 0;
                for (Long cid : convIds) {
                    Convocatoria conv = convocatoriaRepository.findById(cid).orElse(null);
                    if (conv == null) continue;
                    List<Modulo> existentes = moduloRepository.findByConvocatoriaOrderByOrdenAscCreatedAtAsc(conv);
                    boolean yaExiste = existentes.stream()
                            .anyMatch(m -> m.getTitulo().trim().equalsIgnoreCase(plantilla.titulo().trim()));
                    if (!yaExiste) {
                        plantillaService.crearModulo(conv, user, plantillaId, existentes.size() + 1);
                        aplicadas++;
                    }
                }
                resp.setMensaje("Listo, plantilla \"" + plantilla.titulo() + "\" activada en " + aplicadas + " convocatoria(s) seleccionada(s).");
            }
            case "GESTIONAR_PLANTILLA_ESTRUCTURA" -> {
                if (user.getRol() != Rol.ADMIN) {
                    throw new AccessDeniedException("Solo Administradores pueden modificar plantillas.");
                }
                String raw = req.getValorTexto() != null ? req.getValorTexto() : "";
                String[] parts = raw.split("::", -1);
                String op = parts.length > 0 ? parts[0] : "";
                String arg1 = parts.length > 1 ? parts[1] : "";
                String arg2 = parts.length > 2 ? parts[2] : "";
                switch (op) {
                    case "CREAR_PLANTILLA" -> {
                        List<ActividadDatos> acts = new ArrayList<>();
                        if (!arg2.isBlank()) {
                            for (String tTit : arg2.split("\\|\\|")) {
                                if (tTit.isBlank()) continue;
                                acts.add(new ActividadDatos(null, tTit.trim(), "", "PDF", 10, 100.0, true, true, null, null, null, true, List.of(), List.of()));
                            }
                        }
                        plantillaService.crear(new PlantillaDatos(null, arg1, "", acts));
                        resp.setMensaje("Plantilla \"" + arg1 + "\" creada correctamente" + (acts.isEmpty() ? "." : " con " + acts.size() + " tarea(s)."));
                    }
                    case "RENOMBRAR_PLANTILLA" -> {
                        PlantillaDatos p = plantillaService.listar().stream().filter(x -> req.getTargetId().equals(x.id())).findFirst()
                                .orElseThrow(() -> new IllegalArgumentException("Plantilla no encontrada."));
                        plantillaService.actualizar(p.id(), new PlantillaDatos(p.id(), arg1, p.descripcion(), p.actividades()));
                        resp.setMensaje("Plantilla renombrada a \"" + arg1 + "\".");
                    }
                    case "ELIMINAR_PLANTILLA" -> {
                        plantillaService.eliminar(req.getTargetId());
                        resp.setMensaje("Plantilla eliminada del catálogo.");
                    }
                    case "AGREGAR_TAREA" -> {
                        PlantillaDatos p = plantillaService.listar().stream().filter(x -> req.getTargetId().equals(x.id())).findFirst()
                                .orElseThrow(() -> new IllegalArgumentException("Plantilla no encontrada."));
                        List<ActividadDatos> nuevasActs = new ArrayList<>(p.actividades() != null ? p.actividades() : List.of());
                        nuevasActs.add(new ActividadDatos(null, arg1, "", "PDF", 10, 100.0, true, true, null, null, null, true, List.of(), List.of()));
                        plantillaService.actualizar(p.id(), new PlantillaDatos(p.id(), p.titulo(), p.descripcion(), nuevasActs));
                        resp.setMensaje("Tarea \"" + arg1 + "\" agregada a \"" + p.titulo() + "\".");
                    }
                    case "ELIMINAR_TAREA" -> {
                        PlantillaDatos p = plantillaService.listar().stream().filter(x -> req.getTargetId().equals(x.id())).findFirst()
                                .orElseThrow(() -> new IllegalArgumentException("Plantilla no encontrada."));
                        List<ActividadDatos> filtradas = (p.actividades() != null ? p.actividades() : List.<ActividadDatos>of()).stream()
                                .filter(a -> !a.titulo().toLowerCase().contains(arg1.toLowerCase()))
                                .toList();
                        plantillaService.actualizar(p.id(), new PlantillaDatos(p.id(), p.titulo(), p.descripcion(), filtradas));
                        resp.setMensaje("Tarea \"" + arg1 + "\" eliminada de \"" + p.titulo() + "\".");
                    }
                    default -> throw new IllegalArgumentException("Operación de plantilla no soportada.");
                }
            }
            case "GENERAR_GRUPOS_LOTE" -> {
                String[] parts = (req.getValorTexto() != null ? req.getValorTexto() : "5:4").split(":");
                int cantidad = Integer.parseInt(parts[0]);
                int cupo = parts.length > 1 ? Integer.parseInt(parts[1]) : 4;
                GenerarLoteGruposRequest loteReq = new GenerarLoteGruposRequest();
                loteReq.setCantidad(cantidad);
                loteReq.setCapacidadMaxima(cupo);
                loteReq.setPrefijo("Grupo");
                grupoService.generarLoteGrupos(req.getTargetId(), loteReq, userEmail);
                resp.setMensaje("Se generaron " + cantidad + " grupos (cupo máx. " + cupo + ") correctamente.");
            }
            case "RESOLVER_INSCRIPCIONES_LOTE" -> {
                boolean rechazar = "RECHAZAR".equalsIgnoreCase(req.getValorTexto());
                List<Long> ids = req.getTargetIds() != null ? req.getTargetIds() : List.of();
                int count = 0;
                for (Long partId : ids) {
                    if (rechazar) {
                        convocatoriaService.rechazarEstudiante(req.getTargetId(), partId, "Rechazado por docente/administrador", userEmail);
                    } else {
                        convocatoriaService.admitirEstudiante(req.getTargetId(), partId, userEmail);
                    }
                    count++;
                }
                resp.setMensaje("Listo, se " + (rechazar ? "rechazaron " : "admitieron ") + count + " inscripción(es).");
            }
            case "GESTIONAR_USUARIO_ADMIN" -> {
                if (user.getRol() != Rol.ADMIN) {
                    throw new AccessDeniedException("Solo Administradores pueden modificar usuarios.");
                }
                User target = userRepository.findById(req.getTargetId())
                        .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
                String val = req.getValorTexto() != null ? req.getValorTexto() : "";
                if (val.startsWith("ESTADO:")) {
                    target.setEstado(EstadoUsuario.valueOf(val.substring(7)));
                    userRepository.save(target);
                    resp.setMensaje("Estado de " + target.getNombreCompleto() + " actualizado a " + target.getEstado().name() + ".");
                } else if (val.startsWith("ROL:")) {
                    target.setRol(Rol.valueOf(val.substring(4)));
                    userRepository.save(target);
                    resp.setMensaje("Rol de " + target.getNombreCompleto() + " actualizado a " + target.getRol().name() + ".");
                }
            }
            default -> throw new IllegalArgumentException("Acción de confirmación no soportada.");
        }

        return resp;
    }

    private LocalDateTime parsearFecha(String texto, LocalTime horaPorDefecto) {
        String clean = texto.trim();
        if (clean.length() == 10) {
            return LocalDateTime.of(LocalDate.parse(clean), horaPorDefecto);
        }
        if (clean.length() >= 16) {
            return LocalDateTime.parse(clean.substring(0, 16));
        }
        return LocalDateTime.parse(clean);
    }
}
