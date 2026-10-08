package com.ficct.investigacion.controller;

import com.ficct.investigacion.config.JwtService;
import com.ficct.investigacion.dto.DocumentoDTO;
import com.ficct.investigacion.dto.DocumentoLiveMessage;
import com.ficct.investigacion.dto.DocumentoPresenceMessage;
import com.ficct.investigacion.service.DocumentoLiveVersionService;
import com.ficct.investigacion.service.DocumentoService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Controller
public class DocumentoRealtimeController {

    private static final int MAX_LIVE_HTML_CHARS = 1_500_000;
    private static final int MAX_LIVE_STEPS = 100;
    private static final int MAX_CURSOR_POSITION = 2_000_000;
    private static final int MAX_SESSION_ID_CHARS = 120;
    private static final int MAX_USER_LABEL_CHARS = 120;
    private static final int MAX_COLOR_CHARS = 16;
    private static final long MIN_SNAPSHOT_INTERVAL_MS = 250;
    private static final long MIN_STEPS_INTERVAL_MS = 40;
    private static final long MIN_CURSOR_INTERVAL_MS = 80;
    private static final long MIN_PRESENCE_INTERVAL_MS = 1000;
    private static final long LIVE_RATE_LIMIT_TTL_MS = 5 * 60 * 1000;
    private static final int LIVE_RATE_LIMIT_CLEANUP_THRESHOLD = 512;

    private final SimpMessagingTemplate messagingTemplate;
    private final DocumentoService documentoService;
    private final JwtService jwtService;
    private final DocumentoLiveVersionService liveVersionService;
    private final ConcurrentMap<String, Long> lastLiveMessageAt = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Long> lastPresenceMessageAt = new ConcurrentHashMap<>();

    public DocumentoRealtimeController(SimpMessagingTemplate messagingTemplate,
                                       DocumentoService documentoService,
                                       JwtService jwtService,
                                       DocumentoLiveVersionService liveVersionService) {
        this.messagingTemplate = messagingTemplate;
        this.documentoService = documentoService;
        this.jwtService = jwtService;
        this.liveVersionService = liveVersionService;
    }

    @MessageMapping("/documentos/{documentoId}/live")
    public void retransmitirSnapshot(@DestinationVariable Long documentoId,
                                     @Header(name = "Authorization", required = false) String authorization,
                                     @Payload DocumentoLiveMessage message) {
        if (message == null || message.getSessionId() == null || message.getSessionId().isBlank()) {
            return;
        }
        if (!identidadMensajeValida(message.getSessionId(), message.getUsuario())) {
            return;
        }
        String type = message.getType() == null || message.getType().isBlank() ? "snapshot" : message.getType();
        if (!"snapshot".equals(type) && !"steps".equals(type) && !"cursor".equals(type)) {
            return;
        }
        if ("snapshot".equals(type) && (message.getHtml() == null || message.getHtml().isBlank())) {
            return;
        }
        if ("snapshot".equals(type) && message.getHtml().length() > MAX_LIVE_HTML_CHARS) {
            return;
        }
        if ("steps".equals(type) && (message.getSteps() == null || message.getSteps().isEmpty())) {
            return;
        }
        if ("steps".equals(type) && message.getSteps().size() > MAX_LIVE_STEPS) {
            return;
        }
        if ("cursor".equals(type) && (message.getCursorFrom() == null || message.getCursorTo() == null)) {
            return;
        }
        if ("cursor".equals(type) && !cursorDentroDeRango(message)) {
            return;
        }
        if ("cursor".equals(type) && !colorValido(message.getColor())) {
            return;
        }
        if (debeLimitarMensajeLive(documentoId, type, message.getSessionId())) {
            return;
        }
        String userEmail = validarToken(authorization);
        DocumentoDTO documento = documentoService.obtenerPorId(documentoId, userEmail);
        if (documento.getMiPermiso() == null) {
            throw new AccessDeniedException("No tiene permisos para ver este documento.");
        }
        if (("snapshot".equals(type) || "steps".equals(type)) && "LECTURA".equals(documento.getMiPermiso())) {
            throw new AccessDeniedException("No tiene permisos de edicion en este documento.");
        }
        message.setDocumentoId(documentoId);
        message.setType(type);
        if ("snapshot".equals(type) || "steps".equals(type)) {
            long currentVersion = liveVersionService.currentVersion(documentoId);
            long baseVersion = message.getBaseVersion() == null ? currentVersion : message.getBaseVersion();
            long nextVersion = liveVersionService.nextVersion(documentoId);
            message.setBaseVersion(baseVersion);
            message.setServerVersion(nextVersion);
            message.setStale(baseVersion < currentVersion);
        }
        message.setAt(LocalDateTime.now().toString());
        messagingTemplate.convertAndSend("/topic/documentos/" + documentoId + "/live", message);
    }

    @MessageMapping("/documentos/{documentoId}/presence")
    public void retransmitirPresencia(@DestinationVariable Long documentoId,
                                      @Header(name = "Authorization", required = false) String authorization,
                                      @Payload DocumentoPresenceMessage message) {
        if (message == null || message.getSessionId() == null || message.getSessionId().isBlank()) {
            return;
        }
        if (!identidadMensajeValida(message.getSessionId(), message.getUsuario())) {
            return;
        }
        String event = message.getEvent() == null || message.getEvent().isBlank() ? "heartbeat" : message.getEvent();
        if (!"join".equals(event) && !"heartbeat".equals(event) && !"leave".equals(event)) {
            return;
        }
        if (debeLimitarPresencia(documentoId, event, message.getSessionId())) {
            return;
        }
        String userEmail = validarToken(authorization);
        DocumentoDTO documento = documentoService.obtenerPorId(documentoId, userEmail);
        if (documento.getMiPermiso() == null) {
            throw new AccessDeniedException("No tiene permisos para ver este documento.");
        }
        message.setDocumentoId(documentoId);
        message.setEvent(event);
        message.setAt(LocalDateTime.now().toString());
        messagingTemplate.convertAndSend("/topic/documentos/" + documentoId + "/presence", message);
        if ("leave".equals(event)) {
            limpiarRateLimitDeSesion(documentoId, message.getSessionId());
            limpiarRateLimitPresenciaDeSesion(documentoId, message.getSessionId());
        }
    }

    private String validarToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new AccessDeniedException("Token requerido para sincronizacion en vivo.");
        }
        try {
            return jwtService.extractUsername(authorization.substring(7));
        } catch (Exception e) {
            throw new AccessDeniedException("Token invalido para sincronizacion en vivo.");
        }
    }

    private boolean cursorDentroDeRango(DocumentoLiveMessage message) {
        return message.getCursorFrom() >= 0
                && message.getCursorTo() >= 0
                && message.getCursorFrom() <= MAX_CURSOR_POSITION
                && message.getCursorTo() <= MAX_CURSOR_POSITION;
    }

    private boolean identidadMensajeValida(String sessionId, String usuario) {
        return sessionId.length() <= MAX_SESSION_ID_CHARS
                && (usuario == null || usuario.length() <= MAX_USER_LABEL_CHARS);
    }

    private boolean colorValido(String color) {
        return color == null || (color.length() <= MAX_COLOR_CHARS && color.matches("^#[0-9a-fA-F]{6}$"));
    }

    private boolean debeLimitarMensajeLive(Long documentoId, String type, String sessionId) {
        long minInterval = intervaloMinimoLive(type);
        if (minInterval <= 0) {
            return false;
        }
        long now = System.currentTimeMillis();
        limpiarRateLimitAntiguoSiCorresponde(now);
        String key = documentoId + ":" + sessionId + ":" + type;
        Long previous = lastLiveMessageAt.put(key, now);
        return previous != null && now - previous < minInterval;
    }

    private long intervaloMinimoLive(String type) {
        if ("snapshot".equals(type)) return MIN_SNAPSHOT_INTERVAL_MS;
        if ("steps".equals(type)) return MIN_STEPS_INTERVAL_MS;
        if ("cursor".equals(type)) return MIN_CURSOR_INTERVAL_MS;
        return 0;
    }

    private void limpiarRateLimitDeSesion(Long documentoId, String sessionId) {
        String prefix = documentoId + ":" + sessionId + ":";
        lastLiveMessageAt.keySet().removeIf(key -> key.startsWith(prefix));
    }

    private void limpiarRateLimitAntiguoSiCorresponde(long now) {
        if (lastLiveMessageAt.size() < LIVE_RATE_LIMIT_CLEANUP_THRESHOLD) {
            if (lastPresenceMessageAt.size() < LIVE_RATE_LIMIT_CLEANUP_THRESHOLD) {
                return;
            }
        }
        lastLiveMessageAt.entrySet().removeIf(entry -> now - entry.getValue() > LIVE_RATE_LIMIT_TTL_MS);
        lastPresenceMessageAt.entrySet().removeIf(entry -> now - entry.getValue() > LIVE_RATE_LIMIT_TTL_MS);
    }

    private boolean debeLimitarPresencia(Long documentoId, String event, String sessionId) {
        if ("leave".equals(event)) {
            return false;
        }
        long now = System.currentTimeMillis();
        limpiarRateLimitAntiguoSiCorresponde(now);
        String key = documentoId + ":" + sessionId + ":" + event;
        Long previous = lastPresenceMessageAt.put(key, now);
        return previous != null && now - previous < MIN_PRESENCE_INTERVAL_MS;
    }

    private void limpiarRateLimitPresenciaDeSesion(Long documentoId, String sessionId) {
        String prefix = documentoId + ":" + sessionId + ":";
        lastPresenceMessageAt.keySet().removeIf(key -> key.startsWith(prefix));
    }
}
