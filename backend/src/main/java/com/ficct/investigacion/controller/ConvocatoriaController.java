package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.model.EstadoConvocatoria;
import com.ficct.investigacion.service.ConvocatoriaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/convocatorias")
public class ConvocatoriaController {

    private final ConvocatoriaService convocatoriaService;

    public ConvocatoriaController(ConvocatoriaService convocatoriaService) {
        this.convocatoriaService = convocatoriaService;
    }

    /**
     * Listar todas las convocatorias para el panel interno
     */
    @GetMapping("/admin")
    public ResponseEntity<List<ConvocatoriaDTO>> listarAdmin() {
        return ResponseEntity.ok(convocatoriaService.listarAdmin());
    }

    /**
     * APARTADO: Mis Áreas (Docente, Estudiante, Jurado)
     */
    @GetMapping("/mis-areas")
    public ResponseEntity<List<ConvocatoriaDTO>> listarMisAreas(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(convocatoriaService.listarMisAreas(userDetails.getUsername()));
    }

    /**
     * Catálogo de docentes y jurados activos para asignar como encargados/evaluadores
     */
    @GetMapping("/encargados-disponibles")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<Map<String, List<UserDTO>>> listarEncargadosDisponibles() {
        return ResponseEntity.ok(convocatoriaService.listarEncargadosDisponibles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String email = userDetails != null ? userDetails.getUsername() : null;
            return ResponseEntity.ok(convocatoriaService.obtenerPorIdConUsuario(id, email));
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * HU-05: Creación de convocatoria
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> crearConvocatoria(
            @Valid @RequestBody ConvocatoriaRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            ConvocatoriaDTO creada = convocatoriaService.crearConvocatoria(request, userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(creada);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Edición de convocatoria existente
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> actualizarConvocatoria(
            @PathVariable Long id,
            @Valid @RequestBody ConvocatoriaRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            ConvocatoriaDTO actualizada = convocatoriaService.actualizarConvocatoria(id, request, userDetails.getUsername());
            return ResponseEntity.ok(actualizada);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * HU-06: Publicación de convocatorias
     */
    @PutMapping("/{id}/publicar")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> publicarConvocatoria(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            ConvocatoriaDTO publicada = convocatoriaService.publicarConvocatoria(id, userDetails.getUsername());
            return ResponseEntity.ok(publicada);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Cambiar estado directamente (Borrador, Publicada, Finalizada)
     */
    @PutMapping("/{id}/estado")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cambiarEstado(
            @PathVariable Long id,
            @RequestParam EstadoConvocatoria nuevoEstado
    ) {
        try {
            ConvocatoriaDTO actualizada = convocatoriaService.cambiarEstado(id, nuevoEstado);
            return ResponseEntity.ok(actualizada);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // ==========================================
    // PARTICIPANTES DEL ÁREA (DOCENTES, JURADOS, ESTUDIANTES)
    // ==========================================

    @GetMapping("/{id}/participantes")
    public ResponseEntity<List<ConvocatoriaParticipanteDTO>> listarParticipantes(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(convocatoriaService.listarParticipantes(id, username));
    }

    @PostMapping("/{id}/participantes")
    public ResponseEntity<?> designarParticipante(
            @PathVariable Long id,
            @RequestBody DesignarParticipanteRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            ConvocatoriaParticipanteDTO asignado =
                    convocatoriaService.designarParticipante(id, request, userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(asignado);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/{id}/inscribirse")
    public ResponseEntity<?> inscribirEstudiante(
            @PathVariable Long id,
            @RequestBody(required = false) InscribirseAreaRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            ConvocatoriaParticipanteDTO inscrito =
                    convocatoriaService.inscribirEstudiante(id, request, userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(inscrito);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Declinar / cancelar solicitud pendiente de inscripción por el estudiante
     */
    @DeleteMapping("/{id}/declinar-solicitud")
    public ResponseEntity<?> declinarSolicitud(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            convocatoriaService.declinarSolicitudEstudiante(id, userDetails.getUsername());
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "Solicitud de inscripción cancelada exitosamente.");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Admitir a un estudiante postulante (Admin o Docente a cargo)
     */
    @PutMapping("/{id}/participantes/{participanteId}/admitir")
    public ResponseEntity<?> admitirEstudiante(
            @PathVariable Long id,
            @PathVariable Long participanteId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            ConvocatoriaParticipanteDTO admitido =
                    convocatoriaService.admitirEstudiante(id, participanteId, userDetails.getUsername());
            return ResponseEntity.ok(admitido);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Rechazar la solicitud de un estudiante postulante (Admin o Docente a cargo)
     */
    @PutMapping("/{id}/participantes/{participanteId}/rechazar")
    public ResponseEntity<?> rechazarEstudiante(
            @PathVariable Long id,
            @PathVariable Long participanteId,
            @RequestBody(required = false) ResponderSolicitudRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            String motivo = request != null ? request.getMotivo() : null;
            ConvocatoriaParticipanteDTO rechazado =
                    convocatoriaService.rechazarEstudiante(id, participanteId, motivo, userDetails.getUsername());
            return ResponseEntity.ok(rechazado);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/{id}/participantes/{participanteId}")
    public ResponseEntity<?> removerParticipante(
            @PathVariable Long id,
            @PathVariable Long participanteId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            convocatoriaService.removerParticipante(id, participanteId, userDetails.getUsername());
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "Participante removido del área exitosamente");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
