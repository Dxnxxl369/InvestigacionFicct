package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.service.GrupoService;
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
@RequestMapping("/api/convocatorias/{convocatoriaId}/grupos")
public class GrupoController {

    private final GrupoService grupoService;

    public GrupoController(GrupoService grupoService) {
        this.grupoService = grupoService;
    }

    @GetMapping
    public ResponseEntity<GruposAreaResponse> obtenerGruposArea(@PathVariable Long convocatoriaId) {
        return ResponseEntity.ok(grupoService.obtenerGruposArea(convocatoriaId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> crearGrupo(
            @PathVariable Long convocatoriaId,
            @RequestBody CrearGrupoRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            GrupoDTO dto = grupoService.crearGrupo(convocatoriaId, request, userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/generar-lote")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> generarLoteGrupos(
            @PathVariable Long convocatoriaId,
            @RequestBody GenerarLoteGruposRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            List<GrupoDTO> dtos = grupoService.generarLoteGrupos(convocatoriaId, request, userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(dtos);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PutMapping("/{grupoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> actualizarGrupo(
            @PathVariable Long convocatoriaId,
            @PathVariable Long grupoId,
            @RequestBody CrearGrupoRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            GrupoDTO dto = grupoService.actualizarGrupo(convocatoriaId, grupoId, request, userDetails.getUsername());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/{grupoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> eliminarGrupo(
            @PathVariable Long convocatoriaId,
            @PathVariable Long grupoId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            grupoService.eliminarGrupo(convocatoriaId, grupoId, userDetails.getUsername());
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "Grupo eliminado correctamente. Los miembros han quedado disponibles como estudiantes individuales.");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/{grupoId}/miembros/{participanteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> asignarMiembro(
            @PathVariable Long convocatoriaId,
            @PathVariable Long grupoId,
            @PathVariable Long participanteId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            GrupoDTO dto = grupoService.asignarMiembro(convocatoriaId, grupoId, participanteId, userDetails.getUsername());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/{grupoId}/miembros/{participanteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<?> removerMiembro(
            @PathVariable Long convocatoriaId,
            @PathVariable Long grupoId,
            @PathVariable Long participanteId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            GrupoDTO dto = grupoService.removerMiembro(convocatoriaId, grupoId, participanteId, userDetails.getUsername());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
