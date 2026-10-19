package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.*;
import com.ficct.investigacion.service.JuradoAsignacionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/convocatorias/{convocatoriaId}/jurados")
public class JuradoAsignacionController {
    private final JuradoAsignacionService service;

    public JuradoAsignacionController(JuradoAsignacionService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<JuradosConvocatoriaDTO> listar(@PathVariable Long convocatoriaId,
                                                          @AuthenticationPrincipal UserDetails usuario) {
        return ResponseEntity.ok(service.listar(convocatoriaId, usuario.getUsername()));
    }

    @PostMapping
    public ResponseEntity<JuradoAsignacionDTO> crearYAnadir(@PathVariable Long convocatoriaId,
                                                            @Valid @RequestBody CrearJuradoRequest request,
                                                            @AuthenticationPrincipal UserDetails usuario) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                service.crearYAnadir(convocatoriaId, request, usuario.getUsername()));
    }

    @PutMapping("/{participanteId}/asignacion")
    public ResponseEntity<JuradosConvocatoriaDTO> guardar(@PathVariable Long convocatoriaId,
                                                           @PathVariable Long participanteId,
                                                           @RequestBody JuradoAsignacionRequest request,
                                                           @AuthenticationPrincipal UserDetails usuario) {
        return ResponseEntity.ok(service.guardar(convocatoriaId, participanteId, request, usuario.getUsername()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> solicitudInvalida(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> accesoDenegado(AccessDeniedException error) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", error.getMessage()));
    }
}
