package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.ConvocatoriaRequest;
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

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(convocatoriaService.getById(id));
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * HU-05: Creación y parametrización de convocatorias (Admin o Docente)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
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
    public ResponseEntity<List<com.ficct.investigacion.dto.ConvocatoriaParticipanteDTO>> listarParticipantes(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(convocatoriaService.listarParticipantes(id));
    }

    @PostMapping("/{id}/participantes")
    public ResponseEntity<?> designarParticipante(
            @PathVariable Long id,
            @RequestBody com.ficct.investigacion.dto.DesignarParticipanteRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            com.ficct.investigacion.dto.ConvocatoriaParticipanteDTO asignado =
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
            @RequestBody(required = false) com.ficct.investigacion.dto.InscribirseAreaRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            com.ficct.investigacion.dto.ConvocatoriaParticipanteDTO inscrito =
                    convocatoriaService.inscribirEstudiante(id, request, userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(inscrito);
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
