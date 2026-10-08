package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.service.ActividadGrupoService;
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
@RequestMapping("/api/convocatorias/{convocatoriaId}/actividades-grupo")
public class ActividadGrupoController {

    private final ActividadGrupoService actividadGrupoService;

    public ActividadGrupoController(ActividadGrupoService actividadGrupoService) {
        this.actividadGrupoService = actividadGrupoService;
    }

    @GetMapping
    public ResponseEntity<List<ActividadGrupoDTO>> listarActividades(
            @PathVariable Long convocatoriaId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(actividadGrupoService.listarActividades(convocatoriaId, username));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> crearActividad(
            @PathVariable Long convocatoriaId,
            @RequestBody CrearActividadGrupoRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            ActividadGrupoDTO dto = actividadGrupoService.crearActividad(convocatoriaId, request, userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PutMapping("/{actividadId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> actualizarActividad(
            @PathVariable Long convocatoriaId,
            @PathVariable Long actividadId,
            @RequestBody CrearActividadGrupoRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Debes iniciar sesión.");
            }
            ActividadGrupoDTO dto = actividadGrupoService.actualizarActividad(convocatoriaId, actividadId, request, userDetails.getUsername());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/{actividadId}")
    public ResponseEntity<?> obtenerDetalle(
            @PathVariable Long convocatoriaId,
            @PathVariable Long actividadId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            String username = userDetails != null ? userDetails.getUsername() : null;
            ActividadGrupoDTO dto = actividadGrupoService.obtenerDetalle(convocatoriaId, actividadId, username);
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/{actividadId}/elegir")
    public ResponseEntity<?> elegirGrupo(
            @PathVariable Long convocatoriaId,
            @PathVariable Long actividadId,
            @RequestBody ElegirGrupoRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Debes iniciar sesión para elegir grupo.");
            }
            if (request.getGrupoId() == null) {
                return ResponseEntity.badRequest().body("Debes especificar el grupo que deseas seleccionar.");
            }
            ActividadGrupoDTO dto = actividadGrupoService.elegirGrupo(convocatoriaId, actividadId, request.getGrupoId(), userDetails.getUsername());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/{actividadId}/elegir")
    public ResponseEntity<?> anularEleccion(
            @PathVariable Long convocatoriaId,
            @PathVariable Long actividadId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Debes iniciar sesión.");
            }
            ActividadGrupoDTO dto = actividadGrupoService.anularEleccion(convocatoriaId, actividadId, userDetails.getUsername());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
