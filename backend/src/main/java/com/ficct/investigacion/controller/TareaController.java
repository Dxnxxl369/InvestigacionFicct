package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.service.TareaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
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

    // Endpoint específico /tareas/mis-tareas ANTES de /tareas/{id} para evitar colisión de ruta
    @GetMapping("/tareas/mis-tareas")
    public ResponseEntity<?> getMisTareas(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<TareaDTO> misTareas = tareaService.getMisTareas(userDetails.getUsername());
            return ResponseEntity.ok(misTareas);
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

    // ==========================================
    // MEJORAS: SEGUIMIENTO, HISTORIAL, EXPORTACIÓN Y LOTE
    // ==========================================

    @GetMapping("/tareas/{id}/seguimiento")
    public ResponseEntity<?> getSeguimiento(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            MejorasDTOs.SeguimientoTarea seguimiento = tareaService.getSeguimiento(id, userDetails.getUsername());
            return ResponseEntity.ok(seguimiento);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/entregas/{entregaId}/historial")
    public ResponseEntity<?> getHistorial(@PathVariable Long entregaId, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<MejorasDTOs.VersionDTO> historial = tareaService.getHistorial(entregaId, userDetails.getUsername());
            return ResponseEntity.ok(historial);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/tareas/{id}/export-notas")
    public ResponseEntity<?> exportNotasTarea(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String csv = tareaService.exportNotasTarea(id, userDetails.getUsername());
            byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"notas-tarea-" + id + ".csv\"")
                    .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/convocatorias/{id}/export-notas")
    public ResponseEntity<?> exportNotasConvocatoria(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String csv = tareaService.exportNotasConvocatoria(id, userDetails.getUsername());
            byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"notas-convocatoria-" + id + ".csv\"")
                    .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/convocatorias/{id}/participantes/responder-lote")
    public ResponseEntity<?> responderLote(
            @PathVariable Long id,
            @RequestBody MejorasDTOs.ResponderLoteRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            MejorasDTOs.ResultadoLote resultado = tareaService.responderLote(id, request, userDetails.getUsername());
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
