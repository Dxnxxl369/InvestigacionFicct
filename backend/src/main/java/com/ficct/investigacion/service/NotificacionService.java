package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.MejorasDTOs;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;
    private final UserRepository userRepository;
    private final TareaRepository tareaRepository;
    private final EntregaTareaRepository entregaRepository;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final FCMService fcmService;

    public NotificacionService(NotificacionRepository notificacionRepository,
                               UserRepository userRepository,
                               TareaRepository tareaRepository,
                               EntregaTareaRepository entregaRepository,
                               ConvocatoriaParticipanteRepository participanteRepository,
                               FCMService fcmService) {
        this.notificacionRepository = notificacionRepository;
        this.userRepository = userRepository;
        this.tareaRepository = tareaRepository;
        this.entregaRepository = entregaRepository;
        this.participanteRepository = participanteRepository;
        this.fcmService = fcmService;
    }

    public List<MejorasDTOs.NotificacionDTO> listar(String userEmail, int limite) {
        User user = getUserByEmail(userEmail);
        generarRecordatoriosCorte(user.getId());

        int safeLimit = limite > 0 ? Math.min(limite, 100) : 50;
        List<Notificacion> list = notificacionRepository.findByUsuarioIdOrderByCreatedAtDesc(
                user.getId(), PageRequest.of(0, safeLimit)
        );
        return list.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public Map<String, Long> contarNoLeidas(String userEmail) {
        User user = getUserByEmail(userEmail);
        long count = notificacionRepository.countByUsuarioIdAndLeidaFalse(user.getId());
        return Map.of("count", count);
    }

    public void marcarLeida(Long notifId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Notificacion notif = notificacionRepository.findById(notifId)
                .orElseThrow(() -> new IllegalArgumentException("Notificación no encontrada con ID: " + notifId));

        if (!notif.getUsuarioId().equals(user.getId())) {
            throw new AccessDeniedException("No tienes permiso para actualizar esta notificación.");
        }

        notif.setLeida(true);
        notificacionRepository.save(notif);
    }

    public Map<String, Object> marcarTodasLeidas(String userEmail) {
        User user = getUserByEmail(userEmail);
        int marcadas = notificacionRepository.marcarTodasLeidas(user.getId());
        return Map.of("ok", true, "marcadas", marcadas);
    }

    public void crearNotificacion(Long usuarioId, String tipo, String titulo, String mensaje,
                                  Long convocatoriaId, Long tareaId, Long entregaId) {
        try {
            Notificacion n = new Notificacion(usuarioId, tipo, titulo, mensaje, convocatoriaId, tareaId, entregaId);
            notificacionRepository.save(n);

            // Disparo asíncrono de Firebase Cloud Messaging (Push)
            try {
                userRepository.findById(usuarioId).ifPresent(dest -> {
                    if (dest.getFcmToken() != null && !dest.getFcmToken().isBlank()) {
                        Map<String, String> data = new java.util.HashMap<>();
                        data.put("tipo", tipo != null ? tipo : "");
                        if (convocatoriaId != null) data.put("convocatoriaId", String.valueOf(convocatoriaId));
                        if (tareaId != null) data.put("tareaId", String.valueOf(tareaId));
                        if (entregaId != null) data.put("entregaId", String.valueOf(entregaId));
                        fcmService.enviarPush(dest.getFcmToken(), titulo, mensaje, data);
                    }
                });
            } catch (Exception pushErr) {
                // Silencioso para no romper la transacción principal
            }
        } catch (Exception e) {
            // Defensivo para no interrumpir flujos de negocio
        }
    }

    public void generarRecordatoriosCorte(Long usuarioId) {
        try {
            List<ConvocatoriaParticipante> misAreas = participanteRepository
                    .findByUsuarioIdAndEstadoInscripcion(usuarioId, EstadoInscripcion.ACEPTADO);
            LocalDateTime ahora = LocalDateTime.now(ZoneId.of("America/La_Paz"));
            LocalDateTime limiteRecordatorio = ahora.plusHours(24);

            for (ConvocatoriaParticipante part : misAreas) {
                if (part.getRol() != Rol.ESTUDIANTE) {
                    continue;
                }
                Long convId = part.getConvocatoria().getId();
                List<Tarea> tareas = tareaRepository.findByConvocatoriaIdAndHabilitadaTrueOrderByFechaEntregaAsc(convId);
                for (Tarea tarea : tareas) {
                    LocalDateTime fechaRef = tarea.getFechaCorte() != null ? tarea.getFechaCorte() : tarea.getFechaEntrega();
                    if (fechaRef == null) {
                        continue;
                    }

                    if (fechaRef.isAfter(ahora) && fechaRef.isBefore(limiteRecordatorio)) {
                        boolean yaEntrego = entregaRepository.findByTareaAndEstudiante(tarea, part.getUsuario()).isPresent();
                        if (!yaEntrego) {
                            boolean yaNotificado = notificacionRepository.existsByUsuarioIdAndTipoAndTareaId(
                                    usuarioId, Notificacion.CORTE_PROXIMO, tarea.getId()
                            );
                            if (!yaNotificado) {
                                crearNotificacion(
                                        usuarioId,
                                        Notificacion.CORTE_PROXIMO,
                                        "Recordatorio: Tarea próxima a vencer",
                                        "La tarea '" + tarea.getTitulo() + "' vence pronto (" + fechaRef + ").",
                                        convId,
                                        tarea.getId(),
                                        null
                                );
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Defensivo
        }
    }

    private MejorasDTOs.NotificacionDTO toDTO(Notificacion n) {
        return new MejorasDTOs.NotificacionDTO(
                n.getId(),
                n.getTipo(),
                n.getTitulo(),
                n.getMensaje(),
                n.isLeida(),
                n.getCreatedAt(),
                n.getConvocatoriaId(),
                n.getTareaId(),
                n.getEntregaId()
        );
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con email: " + email));
    }
}
