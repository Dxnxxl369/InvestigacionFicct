package com.ficct.investigacion.ai.harness;

import com.ficct.investigacion.dto.CopilotoDTO.ConfirmarAccionRequest;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.dto.TareaRequest;
import com.ficct.investigacion.model.EstadoConvocatoria;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.Tarea;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.TareaRepository;
import com.ficct.investigacion.repository.UserRepository;
import com.ficct.investigacion.service.ConvocatoriaService;
import com.ficct.investigacion.service.TareaService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class CopilotoConfirmacionService {

    private final UserRepository userRepository;
    private final TareaRepository tareaRepository;
    private final TareaService tareaService;
    private final ConvocatoriaService convocatoriaService;

    public CopilotoConfirmacionService(UserRepository userRepository,
                                       TareaRepository tareaRepository,
                                       TareaService tareaService,
                                       ConvocatoriaService convocatoriaService) {
        this.userRepository = userRepository;
        this.tareaRepository = tareaRepository;
        this.tareaService = tareaService;
        this.convocatoriaService = convocatoriaService;
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
            case "CAMBIAR_ESTADO_CONVOCATORIA" -> {
                String val = req.getValorTexto() != null ? req.getValorTexto().trim().toUpperCase() : "";
                if ("ARCHIVADA".equals(val)) {
                    convocatoriaService.archivarConvocatoria(req.getTargetId(), userEmail);
                    resp.setMensaje("Convocatoria archivada correctamente.");
                } else {
                    EstadoConvocatoria estado = EstadoConvocatoria.valueOf(val);
                    if (estado == EstadoConvocatoria.PUBLICADA) {
                        convocatoriaService.publicarConvocatoria(req.getTargetId(), userEmail);
                    } else {
                        convocatoriaService.cambiarEstado(req.getTargetId(), estado);
                    }
                    resp.setMensaje("Estado de la convocatoria actualizado a " + estado.name() + ".");
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
