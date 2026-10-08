package com.ficct.investigacion.controller;

import com.ficct.investigacion.config.JwtService;
import com.ficct.investigacion.dto.DocumentoDTO;
import com.ficct.investigacion.dto.DocumentoLiveMessage;
import com.ficct.investigacion.dto.DocumentoPresenceMessage;
import com.ficct.investigacion.service.DocumentoLiveVersionService;
import com.ficct.investigacion.service.DocumentoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentoRealtimeControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private DocumentoService documentoService;

    @Mock
    private JwtService jwtService;

    private DocumentoLiveVersionService liveVersionService;

    private DocumentoRealtimeController controller;

    @BeforeEach
    void setUp() {
        liveVersionService = new DocumentoLiveVersionService();
        controller = new DocumentoRealtimeController(messagingTemplate, documentoService, jwtService, liveVersionService);
    }

    @Test
    @DisplayName("Documento live: retransmite snapshot cuando el JWT es valido y el usuario edita")
    void retransmiteSnapshotConPermisoEdicion() {
        DocumentoLiveMessage message = snapshotValido();
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("EDICION");

        when(jwtService.extractUsername("token-ok")).thenReturn("brandon@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "brandon@uagrm.edu.bo")).thenReturn(documento);

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        ArgumentCaptor<DocumentoLiveMessage> captor = ArgumentCaptor.forClass(DocumentoLiveMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/documentos/9/live"), captor.capture());
        DocumentoLiveMessage sent = captor.getValue();
        assertEquals(9L, sent.getDocumentoId());
        assertEquals("snapshot", sent.getType());
        assertNotNull(sent.getAt());
        assertEquals("<p>Hola</p>", sent.getHtml());
        assertEquals(0L, sent.getBaseVersion());
        assertEquals(1L, sent.getServerVersion());
        assertFalse(sent.isStale());
    }

    @Test
    @DisplayName("Documento live: marca stale cuando el snapshot parte de una version antigua")
    void marcaSnapshotStaleConBaseAntigua() {
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("EDICION");

        when(jwtService.extractUsername("token-ok")).thenReturn("brandon@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "brandon@uagrm.edu.bo")).thenReturn(documento);

        DocumentoLiveMessage first = snapshotValido();
        first.setBaseVersion(0L);
        controller.retransmitirSnapshot(9L, "Bearer token-ok", first);

        DocumentoLiveMessage second = snapshotValido();
        second.setSessionId("session-2");
        second.setHtml("<p>Cambio stale</p>");
        second.setBaseVersion(0L);
        controller.retransmitirSnapshot(9L, "Bearer token-ok", second);

        ArgumentCaptor<DocumentoLiveMessage> captor = ArgumentCaptor.forClass(DocumentoLiveMessage.class);
        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/documentos/9/live"), captor.capture());
        DocumentoLiveMessage sent = captor.getAllValues().get(1);
        assertEquals(0L, sent.getBaseVersion());
        assertEquals(2L, sent.getServerVersion());
        assertTrue(sent.isStale());
    }

    @Test
    @DisplayName("Documento live: respeta la version avanzada por un guardado persistente")
    void respetaVersionPersistidaPrevia() {
        DocumentoLiveMessage message = snapshotValido();
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("EDICION");
        liveVersionService.markPersistedChange(9L);

        when(jwtService.extractUsername("token-ok")).thenReturn("brandon@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "brandon@uagrm.edu.bo")).thenReturn(documento);

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        ArgumentCaptor<DocumentoLiveMessage> captor = ArgumentCaptor.forClass(DocumentoLiveMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/documentos/9/live"), captor.capture());
        DocumentoLiveMessage sent = captor.getValue();
        assertEquals(1L, sent.getBaseVersion());
        assertEquals(2L, sent.getServerVersion());
        assertFalse(sent.isStale());
    }

    @Test
    @DisplayName("Documento live: rechaza snapshots de usuarios con permiso LECTURA")
    void rechazaSnapshotConPermisoLectura() {
        DocumentoLiveMessage message = snapshotValido();
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("LECTURA");

        when(jwtService.extractUsername("token-lectura")).thenReturn("lector@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "lector@uagrm.edu.bo")).thenReturn(documento);

        assertThrows(AccessDeniedException.class, () ->
                controller.retransmitirSnapshot(9L, "Bearer token-lectura", message)
        );
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Documento live: retransmite cursor con permiso de lectura")
    void retransmiteCursorConPermisoLectura() {
        DocumentoLiveMessage message = cursorValido();
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("LECTURA");

        when(jwtService.extractUsername("token-lector")).thenReturn("lector@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "lector@uagrm.edu.bo")).thenReturn(documento);

        controller.retransmitirSnapshot(9L, "Bearer token-lector", message);

        ArgumentCaptor<DocumentoLiveMessage> captor = ArgumentCaptor.forClass(DocumentoLiveMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/documentos/9/live"), captor.capture());
        DocumentoLiveMessage sent = captor.getValue();
        assertEquals("cursor", sent.getType());
        assertEquals(4, sent.getCursorFrom());
        assertEquals(9, sent.getCursorTo());
        assertEquals("#2563eb", sent.getColor());
        assertNull(sent.getServerVersion());
    }

    @Test
    @DisplayName("Documento live: retransmite steps con version de servidor cuando el usuario edita")
    void retransmiteStepsConPermisoEdicion() {
        DocumentoLiveMessage message = stepsValidos();
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("EDICION");

        when(jwtService.extractUsername("token-ok")).thenReturn("brandon@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "brandon@uagrm.edu.bo")).thenReturn(documento);

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        ArgumentCaptor<DocumentoLiveMessage> captor = ArgumentCaptor.forClass(DocumentoLiveMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/documentos/9/live"), captor.capture());
        DocumentoLiveMessage sent = captor.getValue();
        assertEquals("steps", sent.getType());
        assertEquals(1, sent.getSteps().size());
        assertEquals(0L, sent.getBaseVersion());
        assertEquals(1L, sent.getServerVersion());
        assertFalse(sent.isStale());
    }

    @Test
    @DisplayName("Documento live: rechaza steps de usuarios con permiso LECTURA")
    void rechazaStepsConPermisoLectura() {
        DocumentoLiveMessage message = stepsValidos();
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("LECTURA");

        when(jwtService.extractUsername("token-lectura")).thenReturn("lector@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "lector@uagrm.edu.bo")).thenReturn(documento);

        assertThrows(AccessDeniedException.class, () ->
                controller.retransmitirSnapshot(9L, "Bearer token-lectura", message)
        );
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Documento live: rechaza snapshots sin JWT")
    void rechazaSnapshotSinToken() {
        assertThrows(AccessDeniedException.class, () ->
                controller.retransmitirSnapshot(9L, null, snapshotValido())
        );
        verifyNoInteractions(documentoService);
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Documento live: ignora mensajes incompletos sin consultar permisos")
    void ignoraSnapshotIncompleto() {
        DocumentoLiveMessage message = new DocumentoLiveMessage();
        message.setSessionId("session-1");

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento live: ignora tipos desconocidos sin consultar permisos")
    void ignoraTipoLiveDesconocido() {
        DocumentoLiveMessage message = new DocumentoLiveMessage();
        message.setType("admin-broadcast");
        message.setSessionId("session-1");
        message.setHtml("<p>No debe salir</p>");

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento live: ignora snapshots demasiado grandes antes de consultar permisos")
    void ignoraSnapshotDemasiadoGrande() {
        DocumentoLiveMessage message = snapshotValido();
        message.setHtml("x".repeat(1_500_001));

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento live: ignora paquetes de steps demasiado grandes antes de consultar permisos")
    void ignoraStepsDemasiadoGrandes() {
        DocumentoLiveMessage message = stepsValidos();
        message.setSteps(java.util.stream.IntStream.range(0, 101)
                .mapToObj(index -> Map.<String, Object>of("stepType", "replace", "from", index, "to", index))
                .toList());

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento live: ignora cursores fuera de rango antes de consultar permisos")
    void ignoraCursorFueraDeRango() {
        DocumentoLiveMessage message = cursorValido();
        message.setCursorFrom(-1);

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento live: ignora sessionId demasiado largo antes de consultar permisos")
    void ignoraLiveConSessionIdDemasiadoLargo() {
        DocumentoLiveMessage message = cursorValido();
        message.setSessionId("s".repeat(121));

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento live: ignora usuario demasiado largo antes de consultar permisos")
    void ignoraLiveConUsuarioDemasiadoLargo() {
        DocumentoLiveMessage message = cursorValido();
        message.setUsuario("u".repeat(121));

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento live: ignora color de cursor invalido antes de consultar permisos")
    void ignoraCursorConColorInvalido() {
        DocumentoLiveMessage message = cursorValido();
        message.setColor("javascript:alert(1)");

        controller.retransmitirSnapshot(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento live: limita mensajes repetidos de la misma sesion antes de consultar permisos")
    void limitaMensajesLiveRepetidos() {
        DocumentoLiveMessage first = cursorValido();
        DocumentoLiveMessage second = cursorValido();
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("LECTURA");

        when(jwtService.extractUsername("token-lector")).thenReturn("lector@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "lector@uagrm.edu.bo")).thenReturn(documento);

        controller.retransmitirSnapshot(9L, "Bearer token-lector", first);
        controller.retransmitirSnapshot(9L, "Bearer token-lector", second);

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/documentos/9/live"), any(DocumentoLiveMessage.class));
        verify(jwtService, times(1)).extractUsername("token-lector");
        verify(documentoService, times(1)).obtenerPorId(9L, "lector@uagrm.edu.bo");
    }

    @Test
    @DisplayName("Documento live: limpia rate limit cuando la sesion sale del documento")
    void limpiaRateLimitCuandoSesionSale() {
        DocumentoLiveMessage first = cursorValido();
        DocumentoLiveMessage second = cursorValido();
        DocumentoPresenceMessage leave = presenciaValida("leave");
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("LECTURA");

        when(jwtService.extractUsername("token-lector")).thenReturn("lector@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "lector@uagrm.edu.bo")).thenReturn(documento);

        controller.retransmitirSnapshot(9L, "Bearer token-lector", first);
        controller.retransmitirPresencia(9L, "Bearer token-lector", leave);
        controller.retransmitirSnapshot(9L, "Bearer token-lector", second);

        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/documentos/9/live"), any(DocumentoLiveMessage.class));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/documentos/9/presence"), any(DocumentoPresenceMessage.class));
    }

    @Test
    @DisplayName("Documento presence: retransmite presencia con acceso de lectura")
    void retransmitePresenciaConPermisoLectura() {
        DocumentoPresenceMessage message = presenciaValida("join");
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("LECTURA");

        when(jwtService.extractUsername("token-lector")).thenReturn("lector@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "lector@uagrm.edu.bo")).thenReturn(documento);

        controller.retransmitirPresencia(9L, "Bearer token-lector", message);

        ArgumentCaptor<DocumentoPresenceMessage> captor = ArgumentCaptor.forClass(DocumentoPresenceMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/documentos/9/presence"), captor.capture());
        DocumentoPresenceMessage sent = captor.getValue();
        assertEquals(9L, sent.getDocumentoId());
        assertEquals("join", sent.getEvent());
        assertNotNull(sent.getAt());
    }

    @Test
    @DisplayName("Documento presence: limita eventos repetidos de la misma sesion antes de consultar permisos")
    void limitaPresenciaRepetida() {
        DocumentoPresenceMessage first = presenciaValida("heartbeat");
        DocumentoPresenceMessage second = presenciaValida("heartbeat");
        DocumentoDTO documento = new DocumentoDTO();
        documento.setMiPermiso("LECTURA");

        when(jwtService.extractUsername("token-lector")).thenReturn("lector@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "lector@uagrm.edu.bo")).thenReturn(documento);

        controller.retransmitirPresencia(9L, "Bearer token-lector", first);
        controller.retransmitirPresencia(9L, "Bearer token-lector", second);

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/documentos/9/presence"), any(DocumentoPresenceMessage.class));
        verify(jwtService, times(1)).extractUsername("token-lector");
        verify(documentoService, times(1)).obtenerPorId(9L, "lector@uagrm.edu.bo");
    }

    @Test
    @DisplayName("Documento presence: rechaza presencia sin JWT")
    void rechazaPresenciaSinToken() {
        assertThrows(AccessDeniedException.class, () ->
                controller.retransmitirPresencia(9L, null, presenciaValida("heartbeat"))
        );
        verifyNoInteractions(documentoService);
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Documento presence: rechaza presencia sin permiso sobre el documento")
    void rechazaPresenciaSinPermiso() {
        DocumentoDTO documento = new DocumentoDTO();

        when(jwtService.extractUsername("token-sin-permiso")).thenReturn("externo@uagrm.edu.bo");
        when(documentoService.obtenerPorId(9L, "externo@uagrm.edu.bo")).thenReturn(documento);

        assertThrows(AccessDeniedException.class, () ->
                controller.retransmitirPresencia(9L, "Bearer token-sin-permiso", presenciaValida("heartbeat"))
        );
        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Documento presence: ignora mensajes incompletos sin consultar permisos")
    void ignoraPresenciaIncompleta() {
        DocumentoPresenceMessage message = new DocumentoPresenceMessage();

        controller.retransmitirPresencia(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento presence: ignora eventos desconocidos sin consultar permisos")
    void ignoraEventoPresenciaDesconocido() {
        DocumentoPresenceMessage message = presenciaValida("force-sync");

        controller.retransmitirPresencia(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento presence: ignora sessionId demasiado largo antes de consultar permisos")
    void ignoraPresenciaConSessionIdDemasiadoLargo() {
        DocumentoPresenceMessage message = presenciaValida("heartbeat");
        message.setSessionId("s".repeat(121));

        controller.retransmitirPresencia(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    @Test
    @DisplayName("Documento presence: ignora usuario demasiado largo antes de consultar permisos")
    void ignoraPresenciaConUsuarioDemasiadoLargo() {
        DocumentoPresenceMessage message = presenciaValida("heartbeat");
        message.setUsuario("u".repeat(121));

        controller.retransmitirPresencia(9L, "Bearer token-ok", message);

        verifyNoInteractions(jwtService, documentoService, messagingTemplate);
    }

    private DocumentoLiveMessage snapshotValido() {
        DocumentoLiveMessage message = new DocumentoLiveMessage();
        message.setType("snapshot");
        message.setSessionId("session-1");
        message.setUsuario("Brandon");
        message.setHtml("<p>Hola</p>");
        return message;
    }

    private DocumentoLiveMessage cursorValido() {
        DocumentoLiveMessage message = new DocumentoLiveMessage();
        message.setType("cursor");
        message.setSessionId("session-1");
        message.setUsuario("Brandon");
        message.setCursorFrom(4);
        message.setCursorTo(9);
        message.setColor("#2563eb");
        return message;
    }

    private DocumentoLiveMessage stepsValidos() {
        DocumentoLiveMessage message = new DocumentoLiveMessage();
        message.setType("steps");
        message.setSessionId("session-1");
        message.setUsuario("Brandon");
        message.setSteps(List.of(Map.of("stepType", "replace", "from", 1, "to", 1)));
        return message;
    }

    private DocumentoPresenceMessage presenciaValida(String event) {
        DocumentoPresenceMessage message = new DocumentoPresenceMessage();
        message.setEvent(event);
        message.setSessionId("session-1");
        message.setUsuario("Brandon");
        return message;
    }
}
