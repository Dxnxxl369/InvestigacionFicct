package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.ModuloDTO;
import com.ficct.investigacion.dto.ModuloRequest;
import com.ficct.investigacion.service.ModuloService;
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
@RequestMapping("/api")
public class ModuloController {

    private final ModuloService moduloService;

    public ModuloController(ModuloService moduloService) {
        this.moduloService = moduloService;
    }

    @GetMapping("/convocatorias/{convocatoriaId}/modulos")
    public ResponseEntity<List<ModuloDTO>> listarModulos(@PathVariable Long convocatoriaId) {
        return ResponseEntity.ok(moduloService.listarPorConvocatoria(convocatoriaId));
    }

    @GetMapping("/modulos/{id}")
    public ResponseEntity<?> obtenerModulo(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(moduloService.obtenerPorId(id));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    @PostMapping("/convocatorias/{convocatoriaId}/modulos")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> crearModulo(
            @PathVariable Long convocatoriaId,
            @Valid @RequestBody ModuloRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            ModuloDTO creado = moduloService.crearModulo(convocatoriaId, request, userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(creado);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/modulos/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> actualizarModulo(
            @PathVariable Long id,
            @Valid @RequestBody ModuloRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            ModuloDTO actualizado = moduloService.actualizarModulo(id, request, userDetails.getUsername());
            return ResponseEntity.ok(actualizado);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/modulos/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> eliminarModulo(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            moduloService.eliminarModulo(id, userDetails.getUsername());
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "Módulo eliminado exitosamente.");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
