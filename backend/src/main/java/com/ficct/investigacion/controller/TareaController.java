package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.CalificarEntregaRequest;
import com.ficct.investigacion.dto.DocumentoDTO;
import com.ficct.investigacion.dto.EntregaRequest;
import com.ficct.investigacion.dto.EntregaTareaDTO;
import com.ficct.investigacion.dto.TareaDTO;
import com.ficct.investigacion.dto.TareaRequest;
import com.ficct.investigacion.service.TareaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TareaController {

    private final TareaService tareaService;

    public TareaController(TareaService tareaService) {
        this.tareaService = tareaService;
    }

    @GetMapping("/convocatorias/{convocatoriaId}/tareas")
    public ResponseEntity<?> listarTareasPorConvocatoria(
            @PathVariable Long convocatoriaId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            List<TareaDTO> tareas = tareaService.listarPorConvocatoria(convocatoriaId, userDetails.getUsername());
            return ResponseEntity.ok(tareas);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/convocatorias/{convocatoriaId}/tareas")
    public ResponseEntity<?> crearTareaEnConvocatoria(
            @PathVariable Long convocatoriaId,
            @Valid @RequestBody TareaRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            TareaDTO creada = tareaService.crearTarea(convocatoriaId, request, userDetails.getUsername());
            return ResponseEntity.ok(creada);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/tareas/{id}")
    public ResponseEntity<?> obtenerTarea(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            TareaDTO tarea = tareaService.obtenerPorId(id, userDetails.getUsername());
            return ResponseEntity.ok(tarea);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/tareas/{id}")
    public ResponseEntity<?> actualizarTarea(@PathVariable Long id,
                                            @Valid @RequestBody TareaRequest request,
                                            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            TareaDTO actualizada = tareaService.actualizarTarea(id, request, userDetails.getUsername());
            return ResponseEntity.ok(actualizada);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/tareas/{id}/habilitar")
    public ResponseEntity<?> toggleHabilitar(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            TareaDTO actualizada = tareaService.toggleHabilitada(id, userDetails.getUsername());
            return ResponseEntity.ok(actualizada);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/tareas/{id}/entregar")
    public ResponseEntity<?> entregarTarea(@PathVariable Long id,
                                          @RequestBody EntregaRequest request,
                                          @AuthenticationPrincipal UserDetails userDetails) {
        try {
            EntregaTareaDTO entrega = tareaService.entregarTarea(id, request, userDetails.getUsername());
            return ResponseEntity.ok(entrega);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/tareas/{id}/entregas")
    public ResponseEntity<?> listarEntregas(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<EntregaTareaDTO> entregas = tareaService.listarEntregasPorTarea(id, userDetails.getUsername());
            return ResponseEntity.ok(entregas);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/tareas/{id}/documento-colaborativo")
    public ResponseEntity<?> obtenerDocumentoColaborativo(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            DocumentoDTO documento = tareaService.obtenerDocumentoColaborativo(id, userDetails.getUsername());
            return ResponseEntity.ok(documento);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/entregas/{entregaId}/calificar")
    public ResponseEntity<?> calificarEntrega(@PathVariable Long entregaId,
                                             @Valid @RequestBody CalificarEntregaRequest request,
                                             @AuthenticationPrincipal UserDetails userDetails) {
        try {
            EntregaTareaDTO evaluada = tareaService.calificarEntrega(entregaId, request, userDetails.getUsername());
            return ResponseEntity.ok(evaluada);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
